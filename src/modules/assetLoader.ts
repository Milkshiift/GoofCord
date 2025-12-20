import fs from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { getGoofCordFolderPath, readOrCreateFolder } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

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

		const results = await Promise.all(targetFiles.map(readAssetFile));

		const validAssets = results.filter((asset): asset is AssetTuple => asset !== null);

		console.log(LOG_PREFIX, `Categorized ${validAssets.length} files with extension ${extension}`);
		return validAssets;
	} catch (err) {
		console.error(LOG_PREFIX, `Critical failure categorizing ${extension}:`, err);
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
		const watcher = fs.watch(ASSETS_FOLDER);

		for await (const event of watcher) {
			if (!event.filename?.endsWith(".css")) continue;

			const filename = event.filename;

			await new Promise((resolve) => setTimeout(resolve, 100));

			try {
				const filePath = path.join(ASSETS_FOLDER, filename);
				await fs.access(filePath);
				const content = await fs.readFile(filePath, "utf-8");

				mainWindow?.webContents.send("assetLoader:styleUpdate", {
					file: filename,
					content,
				});
			} catch (err) {
				if (err instanceof Error && "code" in err && err.code === "ENOENT") {
					mainWindow?.webContents.send("assetLoader:styleUpdate", {
						file: filename,
						content: "",
					});
				} else {
					console.error(LOG_PREFIX, `Watcher error for ${filename}:`, err);
				}
			}
		}
	} catch (err) {
		console.error(LOG_PREFIX, `Failed to initialize style watcher:`, err);
	}
}
