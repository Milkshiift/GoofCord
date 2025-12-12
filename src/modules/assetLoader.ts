import fs from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { getGoofCordFolderPath, readOrCreateFolder } from "../utils.ts";
import { mainWindow } from "../windows/main";

export const LOG_PREFIX = pc.yellowBright("[Asset Loader]");

export const enabledAssets: Record<string, string[][]> = {
	scripts: [],
	styles: [],
};

export function getAssets<IPCOn>() {
	return enabledAssets;
}

export const assetsFolder = path.join(getGoofCordFolderPath(), "assets/");

async function categorizeAssetsByExtension(extension: string) {
	try {
		const assetFiles = await readOrCreateFolder(assetsFolder);
		const categorizedAssets: string[][] = [];

		for (const file of assetFiles) {
			const filePath = path.join(assetsFolder, file);

			if (!file.endsWith(extension)) continue;

			const content = await fs.readFile(filePath, "utf-8");
			categorizedAssets.push([file, content]);
		}

		console.log(LOG_PREFIX, `Categorized files with extension ${extension}`);
		return categorizedAssets;
	} catch (err) {
		console.error(LOG_PREFIX, `An error occurred while categorizing files with extension ${extension}: ${err}`);
		return [];
	}
}

export async function categorizeAllAssets() {
	enabledAssets.scripts = await categorizeAssetsByExtension(".js");
	enabledAssets.styles = await categorizeAssetsByExtension(".css");
}

export async function startStyleWatcher() {
	try {
		const watcher = fs.watch(assetsFolder);

		for await (const event of watcher) {
			if (event.filename?.endsWith(".css")) {
				try {
					const filePath = path.join(assetsFolder, event.filename);
					const content = await fs.readFile(filePath, "utf-8");

					mainWindow.webContents.send("assetLoader:styleUpdate", {
						file: event.filename,
						content,
					});
				} catch (err) {
					if (err instanceof Error && "code" in err && err.code === "ENOENT") {
						mainWindow.webContents.send("assetLoader:styleUpdate", {
							file: event.filename,
							content: "",
						});
					} else {
						console.error(LOG_PREFIX, `Error processing style update: ${err}`);
					}
				}
			}
		}
	} catch (err) {
		console.error(LOG_PREFIX, `Failed to start style watcher: ${err}`);
	}
}
