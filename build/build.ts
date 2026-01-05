// Every script in the "build" directory is meant to be run with Bun

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { globImportPlugin } from "bun-plugin-glob-import";
import pc from "picocolors";
import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import { globImporterPlugin } from "./globbyGlob.ts";
import { nativeModulePlugin } from "./nativeImport";

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		dev: { type: "boolean", short: "d" },
		platform: { type: "string" },
		arch: { type: "string" },
		onlyGenerators: { type: "boolean" },
		skipGenerators: { type: "boolean" },
	},
	strict: false,
	allowPositionals: true,
});

const isDev = !!values.dev;

const targetPlatform = typeof values.platform === "string" ? values.platform : process.platform;
const targetArch = typeof values.arch === "string" ? values.arch : process.arch;

if (!values.skipGenerators) {
	console.log("Running generators...");
	console.time("Generators");
	await Promise.all([genSettingsLangFile(), genIpcHandlers()]);
	console.timeEnd("Generators");
	if (values.onlyGenerators) {
		process.exit(0);
	}
}

console.log(pc.cyan(`Build Target: ${targetPlatform}-${targetArch} ${isDev ? "(Dev)" : "(Prod)"}`));

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, "ts-out");
const SRC_DIR = path.join(ROOT_DIR, "src");

console.log("Preparing build...");

await Promise.all([fs.promises.rm(OUT_DIR, { recursive: true, force: true }), copyNativeModules()]);
await fs.promises.mkdir(OUT_DIR, { recursive: true });

console.log("Building...");

const preloadFiles = await searchPreloadFiles();
const mainEntrypoints = [path.join(SRC_DIR, "main.ts"), path.join(SRC_DIR, "modules", "arrpc", "arrpcWorker.ts")];

const buildTasks: Promise<void>[] = [];

buildTasks.push(
	runBuild({
		entrypoints: mainEntrypoints,
		outdir: OUT_DIR,
		target: "node",
		external: ["electron"],
		plugins: [globImporterPlugin, nativeModulePlugin({ targetPlatform, targetArch })],
		splitting: true,
	}),
);

const rendererPath = path.join(SRC_DIR, "windows", "main", "renderer");
const preVencord = path.join(rendererPath, "preVencord", "preVencord.ts");
const postVencord = path.join(rendererPath, "postVencord", "postVencord.ts");
buildTasks.push(
	runBuild({
		entrypoints: [preVencord],
		outdir: path.join(ROOT_DIR, "assets"),
		target: "browser",
		plugins: [globImportPlugin()],
		minify: false,
		sourcemap: false
	}),
);
buildTasks.push(
	runBuild({
		entrypoints: [postVencord],
		outdir: path.join(ROOT_DIR, "assets"),
		target: "browser",
		plugins: [globImportPlugin()],
		minify: false,
		sourcemap: false
	}),
);

const preloadBuilds = preloadFiles.map((preloadFile) => {
	const relativePath = path.relative(SRC_DIR, preloadFile);
	const outDir = path.join(OUT_DIR, path.dirname(relativePath));

	return runBuild({
		entrypoints: [preloadFile],
		outdir: outDir,
		target: "node",
		format: "cjs",
		external: ["electron"],
		plugins: [globImporterPlugin],
	});
});
buildTasks.push(...preloadBuilds);

await Promise.all(buildTasks);

console.log(pc.green("✅ Build completed! 🎉"));

// Helpers

async function runBuild(config: import("bun").BuildConfig) {
	const result = await Bun.build({
		minify: config.minify ?? true,
		sourcemap: (config.sourcemap !== false) && isDev ? "linked" : undefined,
		format: config.format ?? "esm",
		packages: "bundle",
		...config,
	});

	if (result.logs.length) {
		console.log(pc.yellow(`Logs for ${config.entrypoints}:`));
		for (const log of result.logs) console.log(log);
	}

	if (!result.success) {
		console.error(pc.red(`Build failed for ${config.entrypoints}`));
	}
}

async function searchPreloadFiles() {
	const glob = new Bun.Glob("**/preload.mts");
	const results: string[] = [];

	for await (const file of glob.scan({ cwd: SRC_DIR, absolute: true })) {
		results.push(file);
	}
	return results;
}

async function copyNativeModules() {
	const assetsDir = path.join(ROOT_DIR, "assets", "native");
	await fs.promises.mkdir(assetsDir, { recursive: true });

	const modulesToCopy = [
		{
			src: ["node_modules", "@vencord", "venmic", "prebuilds", "venmic-addon-linux-x64", "node-napi-v7.node"],
			dest: ["venmic-linux-x64.node"],
		},
		{
			src: ["node_modules", "@vencord", "venmic", "prebuilds", "venmic-addon-linux-arm64", "node-napi-v7.node"],
			dest: ["venmic-linux-arm64.node"],
		},
		{
			src: ["node_modules", "venbind", "prebuilds", "windows-x86_64", "venbind-windows-x86_64.node"],
			dest: ["venbind-win32-x64.node"],
		},
		{
			src: ["node_modules", "venbind", "prebuilds", "windows-aarch64", "venbind-windows-aarch64.node"],
			dest: ["venbind-win32-arm64.node"],
		},
		{
			src: ["node_modules", "venbind", "prebuilds", "linux-x86_64", "venbind-linux-x86_64.node"],
			dest: ["venbind-linux-x64.node"],
		},
		{
			src: ["node_modules", "venbind", "prebuilds", "linux-aarch64", "venbind-linux-aarch64.node"],
			dest: ["venbind-linux-arm64.node"],
		},
	];

	const results = await Promise.allSettled(
		modulesToCopy.map((mod) => {
			const srcPath = path.join(ROOT_DIR, ...mod.src);
			const destPath = path.join(assetsDir, ...mod.dest);
			return copyFile(srcPath, destPath);
		}),
	);

	const failures = results.filter((r) => r.status === "rejected");
	if (failures.length > 0) {
		console.warn(pc.yellow(`Warning: ${failures.length} native modules failed to copy.`));
	}
}

async function copyFile(src: string, dest: string) {
	if (!fs.existsSync(src)) {
		throw new Error(`Source file not found: ${src}`);
	}
	await Bun.write(dest, Bun.file(src));
}
