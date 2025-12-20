// Every script in the "build" directory is meant to be run with Bun

import fs from "node:fs";
import path from "node:path";
import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import pc from "picocolors";
import { globImporterPlugin } from "./globbyGlob.ts";
import { nativeModulePlugin } from "./nativeImport";
import { globImportPlugin } from "bun-plugin-glob-import";

// --- Argument Parsing ---
const args = process.argv;
const isDev = args.some((arg) => arg === "--dev" || arg === "-d");

const getArg = (name: string) => {
	const prefix = `--${name}=`;
	const arg = args.find((a) => a.startsWith(prefix));
	if (arg) return arg.slice(prefix.length);

	const index = args.indexOf(`--${name}`);
	if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("-")) {
		return args[index + 1];
	}
	return undefined;
};

const targetPlatform = getArg("platform") || process.platform;
const targetArch = getArg("arch") || process.arch;

console.log(pc.cyan(`Build Target: ${targetPlatform}-${targetArch} ${isDev ? "(Dev)" : "(Prod)"}`));
// ------------------------

await copyNativeModules();

await fs.promises.rm("ts-out", { recursive: true, force: true });

console.log("Preprocessing...");
console.time("lang");
await genSettingsLangFile();
console.timeEnd("lang");
console.time("Ipc");
await genIpcHandlers();
console.timeEnd("Ipc");

console.log("Building...");
await fs.promises.mkdir("ts-out");

const preloadFiles = await searchPreloadFiles("src", []);
const mainEntrypoints = [path.join("src", "main.ts"), path.join("src", "modules", "arrpcWorker.ts")];

const mainBundleResult = await Bun.build({
	minify: true,
	sourcemap: isDev ? "linked" : undefined,
	format: "esm",
	external: ["electron"],
	target: "node",
	splitting: true,
	entrypoints: mainEntrypoints,
	outdir: "ts-out",
	packages: "bundle",
	plugins: [globImporterPlugin, nativeModulePlugin({ targetPlatform, targetArch })],
});
if (mainBundleResult.logs.length) console.log(mainBundleResult.logs);

const rendererPath = path.join("src", "windows", "main", "renderer", "renderer.ts");
const relativePath = path.relative("src", rendererPath);
const outDir = path.join("ts-out", path.dirname(relativePath));
const rendererBundleResult = await Bun.build({
	minify: false,
	sourcemap: false,
	format: "esm",
	target: "browser",
	splitting: false,
	entrypoints: [rendererPath],
	outdir: outDir,
	packages: "bundle",
	plugins: [globImportPlugin()],
});
if (rendererBundleResult.logs.length) console.log(rendererBundleResult.logs);

for (const preloadFile of preloadFiles) {
	const relativePath = path.relative("src", preloadFile);
	const outDir = path.join("ts-out", path.dirname(relativePath));

	const preloadBundleResult = await Bun.build({
		minify: true,
		sourcemap: isDev ? "linked" : undefined,
		format: "cjs",
		external: ["electron"],
		target: "node",
		splitting: false,
		entrypoints: [preloadFile],
		outdir: outDir,
		packages: "bundle",
		plugins: [globImporterPlugin],
	});

	if (preloadBundleResult.logs.length) console.log(preloadBundleResult.logs);
}

async function searchPreloadFiles(directory: string, result: string[] = []) {
	await traverseDirectory(directory, async (filePath: string) => {
		if (filePath.endsWith("preload.mts")) {
			result.push(filePath);
		}
	});
	return result;
}

async function traverseDirectory(directory: string, fileHandler: (filePath: string) => void) {
	const files = await fs.promises.readdir(directory);

	for (const file of files) {
		const filePath = path.join(directory, file);
		const stats = await fs.promises.stat(filePath);

		if (stats.isDirectory()) {
			// Recursively search subdirectories
			await traverseDirectory(filePath, fileHandler);
		} else {
			fileHandler(filePath);
		}
	}
}

async function copyNativeModules() {
	try {
		return await Promise.all([
			copyFile("./node_modules/@vencord/venmic/prebuilds/venmic-addon-linux-x64/node-napi-v7.node", "./assets/native/venmic-linux-x64.node"),
			copyFile("./node_modules/@vencord/venmic/prebuilds/venmic-addon-linux-arm64/node-napi-v7.node", "./assets/native/venmic-linux-arm64.node"),

			copyFile("./node_modules/venbind/prebuilds/windows-x86_64/venbind-windows-x86_64.node", "./assets/native/venbind-win32-x64.node"),
			copyFile("./node_modules/venbind/prebuilds/windows-aarch64/venbind-windows-aarch64.node", "./assets/native/venbind-win32-arm64.node"),
			copyFile("./node_modules/venbind/prebuilds/linux-x86_64/venbind-linux-x86_64.node", "./assets/native/venbind-linux-x64.node"),
			copyFile("./node_modules/venbind/prebuilds/linux-aarch64/venbind-linux-aarch64.node", "./assets/native/venbind-linux-arm64.node"),
		]);
	} catch {
		return console.warn("Failed to copy native modules.");
	}
}

async function copyFile(src: string, dest: string) {
	if (!fs.existsSync(src)) {
		throw new Error(`Source file not found: ${src}`);
	}
	await Bun.write(dest, Bun.file(src));
}

console.log(pc.green("✅ Build completed! 🎉"));
