import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { mainWindow } from "../window";

export async function clearCache() {
	console.log("Clearing cache");
	void mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebar("#5865F2")`);

	const userDataPath = app.getPath("userData");
	// Get all folders
	const folders = (await fs.readdir(userDataPath, { withFileTypes: true })).filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

	for (const folder of folders) {
		if (folder.toLowerCase().includes("cache")) {
			try {
				void fs.rm(path.join(userDataPath, folder), { recursive: true, force: true });
			} catch (e) {}
		}
	}
}
