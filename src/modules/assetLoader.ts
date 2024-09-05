import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { ipcMain } from "electron";
import { getGoofCordFolderPath, readOrCreateFolder } from "../utils";
import { error } from "./logger";

export const enabledAssets: Record<string, string[][]> = {
	scripts: [],
	styles: [],
};

ipcMain.on("getAssets", (event) => {
	event.returnValue = enabledAssets;
});

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

		console.log(chalk.yellowBright(`[Asset Loader] Categorized files with extension ${extension}`));
		return categorizedAssets;
	} catch (err) {
		error(`An error occurred while categorizing files with extension ${extension}: ${err}`);
		return [];
	}
}

export async function categorizeAllAssets() {
	enabledAssets.scripts = await categorizeAssetsByExtension(".js");
	enabledAssets.styles = await categorizeAssetsByExtension(".css");
}
