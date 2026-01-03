import { watch } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { getGoofCordFolderPath, readOrCreateFolder } from "../../utils.ts";
import { mainWindow } from "../../windows/main/main.ts";

const LOG_PREFIX = pc.yellowBright("[Asset Loader]");
export const ASSETS_FOLDER = path.join(getGoofCordFolderPath(), "assets/");

export type AssetTuple = [filename: string, content: string];

export const enabledAssets = {
	scripts: [] as AssetTuple[],
	styles: [] as AssetTuple[],
};

export function getAssets<IPCOn>() {
	return enabledAssets;
}

async function readAssetFile(filename: string): Promise<AssetTuple | null> {
	try {
		const filePath = path.join(ASSETS_FOLDER, filename);
		const content = await fs.readFile(filePath, "utf-8");
		return [filename, content];
	} catch (err) {
		console.error(LOG_PREFIX, `Failed to read asset ${filename}:`, err);
		return null;
	}
}

async function categorizeAssetsByExtension(extension: string): Promise<AssetTuple[]> {
	try {
		const allFiles = await readOrCreateFolder(ASSETS_FOLDER);
		const targetFiles = allFiles.filter((file) => file.endsWith(extension));

		// Parallel read
		const results = await Promise.all(targetFiles.map(readAssetFile));

		const validAssets = results.filter((asset): asset is AssetTuple => asset !== null);

		console.log(LOG_PREFIX, `Loaded ${validAssets.length} ${extension} files`);
		return validAssets;
	} catch (err) {
		console.error(LOG_PREFIX, `Critical failure loading ${extension}:`, err);
		return [];
	}
}

export async function categorizeAllAssets() {
	const [scripts, styles] = await Promise.all([categorizeAssetsByExtension(".js"), categorizeAssetsByExtension(".css")]);
	enabledAssets.scripts = scripts;
	enabledAssets.styles = styles;
}

export async function startStyleWatcher() {
	try {
		// Ensure folder exists before watching
		await fs.mkdir(ASSETS_FOLDER, { recursive: true });

		const watcher = watch(ASSETS_FOLDER, { recursive: false });
		let debounceTimer: NodeJS.Timeout | null = null;

		// Batch updates if multiple files change rapidly
		const changedFiles = new Set<string>();

		watcher.on("change", (_eventType, filename) => {
			if (!filename || !filename.toString().endsWith(".css")) return;

			const fileStr = filename.toString();
			changedFiles.add(fileStr);

			if (debounceTimer) clearTimeout(debounceTimer);

			debounceTimer = setTimeout(async () => {
				for (const file of changedFiles) {
					await processStyleUpdate(file);
				}
				changedFiles.clear();
			}, 200);
		});

		console.log(LOG_PREFIX, "Style watcher started");
	} catch (err) {
		console.error(LOG_PREFIX, "Failed to initialize style watcher:", err);
	}
}

async function processStyleUpdate(filename: string) {
	try {
		const filePath = path.join(ASSETS_FOLDER, filename);

		// Check if file still exists
		try {
			await fs.access(filePath);
		} catch {
			// File deleted
			mainWindow?.webContents.send("assetLoader:styleUpdate", {
				file: filename,
				content: "",
			});
			return;
		}

		const content = await fs.readFile(filePath, "utf-8");
		mainWindow?.webContents.send("assetLoader:styleUpdate", {
			file: filename,
			content,
		});
		console.log(LOG_PREFIX, `Hot-reloaded: ${filename}`);
	} catch (err) {
		console.error(LOG_PREFIX, `Error processing update for ${filename}:`, err);
	}
}
