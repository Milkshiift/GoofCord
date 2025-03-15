// Every script in the "build" directory is meant to be run with Bun

import fs from "node:fs";
import path from "node:path";
import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import { generateDTSFile } from "./genSettingsTypes.ts";
import pc from "picocolors";

await fs.promises.rm("ts-out", { recursive: true, force: true });

console.log("Preprocessing...");
await generateDTSFile();
await genSettingsLangFile();
await genIpcHandlers();

console.log("Building...");
await fs.promises.mkdir("ts-out");
const bundleResult = await Bun.build({
	minify: true,
	sourcemap: "none",
	format: "esm",
	external: ["electron"],
	target: "node",
	splitting: true,
	entrypoints: await searchPreloadFiles("src", [path.join("src", "main.ts")]),
	outdir: "ts-out",
	packages: "bundle",
});
if (bundleResult.logs.length) console.log(bundleResult.logs);

await copyVenmic();
await copyVenbind();

await renamePreloadFiles("./ts-out");
await fs.promises.cp("./assets/", "./ts-out/assets", { recursive: true });

async function searchPreloadFiles(directory: string, result: string[] = []) {
	await traverseDirectory(directory, async (filePath: string) => {
		if (filePath.endsWith("preload.mts")) {
			result.push(filePath);
		}
	});
	return result;
}

async function renamePreloadFiles(directoryPath: string) {
	await traverseDirectory(directoryPath, async (filePath: string) => {
		if (filePath.endsWith("preload.js")) {
			const newFilePath = filePath.replace("preload.js", "preload.mjs");
			await fs.promises.rename(filePath, newFilePath);
		}
	});
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

function copyVenmic() {
	if (process.platform !== "linux") return;

	return Promise.all([
		copyFile(
			"./node_modules/@vencord/venmic/prebuilds/venmic-addon-linux-x64/node-napi-v7.node",
			"./assets/venmic-x64.node"
		),
		copyFile(
			"./node_modules/@vencord/venmic/prebuilds/venmic-addon-linux-arm64/node-napi-v7.node",
			"./assets/venmic-arm64.node"
		)
	]).catch(() => console.warn("Failed to copy venmic. Building without venmic support"));
}

function copyVenbind() {
	if (process.platform === "win32") {
		return copyFile(
			"./node_modules/venbind/prebuilds/windows-x86_64/venbind-windows-x86_64.node",
			"./assets/venbind-win32-x64.node"
		).catch(() => console.warn("Failed to copy venbind. Building without venbind support"));
	}

	return copyFile(
		"./node_modules/venbind/prebuilds/linux-x86_64/venbind-linux-x86_64.node",
		"./assets/venbind-linux-x64.node"
	).catch(() => console.warn("Failed to copy venbind. Building without venbind support"));
}

async function copyFile(src: string, dest: string) {
	await Bun.write(dest, Bun.file(src));
}

console.log(pc.green("✅ Build completed! 🎉"));