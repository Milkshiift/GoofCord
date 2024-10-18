import fs from "node:fs";
import path from "node:path";
import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import { generateDTSFile } from "./genSettingsTypes.ts";

const isDev = process.argv.some((arg) => arg === "--dev" || arg === "-d");

await fs.promises.rm("ts-out", { recursive: true, force: true });

await generateDTSFile();
await genSettingsLangFile();
await genIpcHandlers();

await Bun.build({
	minify: false,
	sourcemap: isDev ? "linked" : "external",
	format: "esm",
	external: ["electron"],
	target: "node",
	splitting: true,
	entrypoints: await searchPreloadFiles("src", ["src/main.ts"]),
	outdir: "ts-out",
	packages: "bundle",
});

if (!isDev) await deleteSourceMaps("./ts-out");
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

async function deleteSourceMaps(directoryPath: string) {
	await traverseDirectory(directoryPath, async (filePath: string) => {
		if (filePath.endsWith(".map")) {
			void fs.promises.unlink(filePath);
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
