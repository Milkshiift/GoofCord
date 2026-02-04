import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import pc from "picocolors";
import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import { globImporterPlugin } from "./globbyGlob.ts";
import { nativeModulePlugin } from "./nativeImport";

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, "ts-out");
const SRC_DIR = path.join(ROOT_DIR, "src");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");

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
	if (values.onlyGenerators) process.exit(0);
}

console.log(pc.cyan(`Build Target: ${targetPlatform}-${targetArch} ${isDev ? "(Dev)" : "(Prod)"}`));

console.log("Preparing build...");
await Promise.all([fs.promises.rm(OUT_DIR, { recursive: true, force: true }), copyNativeModules()]);
await fs.promises.mkdir(OUT_DIR, { recursive: true });

console.log("Building...");
console.time("Build");

const results = await Promise.all([buildMain(), ...buildRendererScripts(), ...(await buildPreloads())]);

console.timeEnd("Build");

if (results.every(Boolean)) {
	console.log(pc.green("✅ Build completed! 🎉"));
} else {
	console.error(pc.red("❌ Build completed with errors"));
	process.exit(1);
}

function buildMain() {
	return runBuild({
		entrypoints: [path.join(SRC_DIR, "main.ts"), path.join(SRC_DIR, "modules", "arrpc", "arrpcWorker.ts")],
		outdir: OUT_DIR,
		target: "node",
		external: ["electron"],
		plugins: [globImporterPlugin, nativeModulePlugin({ targetPlatform, targetArch })],
		splitting: true,
	});
}

function buildRendererScripts() {
	const rendererPath = path.join(SRC_DIR, "windows", "main", "renderer");

	return ["preVencord", "postVencord"].map((name) =>
		runBuild({
			entrypoints: [path.join(rendererPath, name, `${name}.ts`)],
			outdir: ASSETS_DIR,
			target: "browser",
			plugins: [globImporterPlugin],
			minify: false,
			sourcemap: false,
			banner: `// ${name.toLowerCase()}marker`,
		}),
	);
}

async function buildPreloads() {
	const glob = new Bun.Glob("**/preload.{mts,tsx}");
	const builds: Promise<boolean>[] = [];

	for await (const file of glob.scan({ cwd: SRC_DIR, absolute: true })) {
		const relativePath = path.relative(SRC_DIR, file);
		builds.push(
			runBuild({
				entrypoints: [file],
				outdir: path.join(OUT_DIR, path.dirname(relativePath)),
				target: "node",
				format: "cjs",
				external: ["electron"],
				plugins: [globImporterPlugin],
			}),
		);
	}
	return builds;
}

async function runBuild(config: import("bun").BuildConfig): Promise<boolean> {
	const result = await Bun.build({
		minify: config.minify ?? true,
		sourcemap: config.sourcemap !== false && isDev ? "linked" : undefined,
		format: config.format ?? "esm",
		packages: "bundle",
		...config,
	});

	if (result.logs.length) {
		console.log(pc.yellow(`Logs for ${config.entrypoints}:`));
		for (const log of result.logs) {
			console.log(log);
		}
	}

	if (!result.success) {
		console.error(pc.red(`Build failed for ${config.entrypoints}`));
	}

	return result.success;
}

async function copyNativeModules() {
	const nativeDir = path.join(ASSETS_DIR, "native");
	await fs.promises.mkdir(nativeDir, { recursive: true });

	const modules: [src: string[], dest: string][] = [
		[["@vencord", "venmic", "prebuilds", "venmic-addon-linux-x64", "node-napi-v7.node"], "venmic-linux-x64.node"],
		[["@vencord", "venmic", "prebuilds", "venmic-addon-linux-arm64", "node-napi-v7.node"], "venmic-linux-arm64.node"],
		[["venbind", "prebuilds", "windows-x86_64", "venbind-windows-x86_64.node"], "venbind-win32-x64.node"],
		[["venbind", "prebuilds", "windows-aarch64", "venbind-windows-aarch64.node"], "venbind-win32-arm64.node"],
		[["venbind", "prebuilds", "linux-x86_64", "venbind-linux-x86_64.node"], "venbind-linux-x64.node"],
		[["venbind", "prebuilds", "linux-aarch64", "venbind-linux-aarch64.node"], "venbind-linux-arm64.node"],
	];

	const results = await Promise.allSettled(
		modules.map(async ([srcParts, dest]) => {
			const src = path.join(ROOT_DIR, "node_modules", ...srcParts);
			await fs.promises.access(src);
			await Bun.write(path.join(nativeDir, dest), Bun.file(src));
		}),
	);

	const failures = results.filter((r) => r.status === "rejected").length;
	if (failures > 0) {
		console.warn(pc.yellow(`Warning: ${failures} native modules failed to copy.`));
	}
}
