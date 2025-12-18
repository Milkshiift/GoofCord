import path from "node:path";
import { BrowserWindow, ipcMain, shell } from "electron";
import { cachedConfig, getConfig } from "../../config.ts";
import type { Config } from "../../configTypes.d.ts";
import { i, initLocalization } from "../../modules/localization.ts";
import { dirname, getCustomIcon, getDisplayVersion, relToAbs, userDataPath } from "../../utils.ts";
import { saveCloud } from "./preload/cloud/cloud.ts";
import html from "./renderer/settings.html";

export let settingsWindow: BrowserWindow;
let isOpen = false;
let originalConfig: Config;

ipcMain.handle("openFolder", async (_event, folder: string) => await shell.openPath(path.join(userDataPath, `/${folder}/`)));

function hasConfigChanged(original: Config, current: Config): boolean {
	if (original.size !== current.size) return true;

	for (const [key, originalValue] of original) {
		if (!current.has(key)) return true;
		const currentValue = current.get(key);

		if (originalValue === currentValue) continue;

		if (JSON.stringify(originalValue) !== JSON.stringify(currentValue)) {
			return true;
		}
	}

	return false;
}

export async function createSettingsWindow<IPCHandle>() {
	if (isOpen) {
		settingsWindow.show();
		settingsWindow.restore();
		return;
	}

	originalConfig = new Map(cachedConfig);

	console.log("Creating a settings window.");
	settingsWindow = new BrowserWindow({
		width: 660,
		height: 700,
		title: i("settingsWindow-title") + getDisplayVersion(),
		darkTheme: true,
		frame: true,
		icon: getCustomIcon(),
		backgroundColor: "#2f3136",
		autoHideMenuBar: true,
		webPreferences: {
			sandbox: true,
			preload: path.join(dirname(), "windows/settings/preload/preload.js"),
		},
	});
	isOpen = true;

	settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	await settingsWindow.loadFile(relToAbs(html.index));

	settingsWindow.on("close", async (event) => {
		isOpen = false;

		if (getConfig("autoSaveCloud") && hasConfigChanged(originalConfig, cachedConfig)) {
			event.preventDefault();
			try {
				console.log("Settings changed, auto-saving to cloud...");
				await saveCloud(true);
				settingsWindow.destroy();
			} catch (error) {
				console.error("Error saving config before closing:", error);
				settingsWindow.destroy();
			}
		}
	});
}

export async function hotreloadLocale<IPCHandle>() {
	await initLocalization();
	if (settingsWindow) settingsWindow.webContents.reload();
}