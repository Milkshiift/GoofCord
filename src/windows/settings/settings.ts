import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { i } from "@root/src/modules/localization/localization.main.ts";
import { saveCloud } from "@root/src/windows/settings/cloud/cloud.ts";
import { app, BrowserWindow, dialog, shell } from "electron";
import { cachedConfig, firstLaunch, getConfig } from "../../config.ts";
import { registerHandle } from "../../ipc/registry.main.ts";
import { initLocalization } from "../../modules/localization/localization.main.ts";
import type { Config } from "../../settingsSchema.ts";
import { dirname, getCustomIcon, getDisplayVersion, relToAbs, userDataPath } from "../../utils.ts";
import { mainWindow } from "../main/main.ts";
import html from "./renderer/settings.html";

export let settingsWindow: BrowserWindow;
let isOpen = false;
let originalConfig: Config;

registerHandle("openFolder", async (_event, folder: string) => await shell.openPath(path.join(userDataPath, `/${folder}/`)));
registerHandle("invidiousConfigChanged", () => mainWindow.webContents.send("invidiousConfigChanged"));

function hasConfigChanged(original: Config, current: Config): boolean {
	if (original.size !== current.size) return true;
	for (const [key, val] of original) {
		if (!current.has(key)) return true;
		if (!isDeepStrictEqual(val, current.get(key))) return true;
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

	if (firstLaunch) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		await dialog.showMessageBox({
			message: i("welcomeMessage"),
			type: "info",
			icon: getCustomIcon(),
			noLink: false,
		});
		app.relaunch(); // Relaunches only when user closes settings window
	}

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

export async function reloadWindow<IPCHandle>() {
	if (settingsWindow) settingsWindow.webContents.reload();
}
