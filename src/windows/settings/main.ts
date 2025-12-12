import path from "node:path";
import { BrowserWindow, ipcMain, shell } from "electron";
import { cachedConfig, getConfig } from "../../config.ts";
import type { Config } from "../../configTypes.d.ts";
import { i, initLocalization } from "../../modules/localization.ts";
import { dirname, getAsset, getCustomIcon, getDisplayVersion, userDataPath } from "../../utils.ts";
import { saveCloud } from "./cloud/cloud.ts";

export let settingsWindow: BrowserWindow;
let isOpen = false;
let originalConfig: Config;

ipcMain.handle("openFolder", async (_event, folder: string) => await shell.openPath(path.join(userDataPath, `/${folder}/`)));

export async function createSettingsWindow<IPCHandle>() {
	if (isOpen) {
		settingsWindow.show();
		settingsWindow.restore();
		return;
	}

	originalConfig = { ...cachedConfig };

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
			preload: path.join(dirname(), "windows/settings/preload.js"),
		},
	});
	isOpen = true;

	settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	await settingsWindow.loadURL(`file://${getAsset("html/settings.html")}`);

	settingsWindow.on("close", async (event) => {
		isOpen = false;
		if (originalConfig !== cachedConfig && getConfig("autoSaveCloud")) {
			event.preventDefault();
			try {
				await saveCloud(true);
				settingsWindow.destroy(); // Not trigger close event
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
