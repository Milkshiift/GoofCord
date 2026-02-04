import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { getConfigBulk } from "@root/src/stores/config/config.main.ts";
import { i, initLocalization } from "@root/src/stores/localization/localization.main.ts";
import { saveCloud } from "@root/src/windows/settings/cloud/cloud.ts";
import { app, BrowserWindow, dialog, shell } from "electron";
import type { Config } from "../../settingsSchema.ts";
import { firstLaunch, getConfig } from "../../stores/config/config.main.ts";
import { dirname, getCustomIcon, getDisplayVersion, relToAbs, userDataPath } from "../../utils.ts";
import { mainWindow } from "../main/main.ts";
import html from "./renderer/settings.html";

export let settingsWindow: BrowserWindow | undefined;
let originalConfig: Config;

export async function openFolder<IPCHandle>(folder: string) {
	await shell.openPath(path.join(userDataPath, `/${folder}/`));
}

export async function invidiousConfigChanged<IPCHandle>() {
	mainWindow.webContents.send("invidiousConfigChanged");
}

function hasConfigChanged(original: Config, current: Config): boolean {
	return !isDeepStrictEqual(original, current);
}

export async function createSettingsWindow<IPCHandle>() {
	if (settingsWindow) {
		settingsWindow.show();
		settingsWindow.restore();
		return;
	}

	originalConfig = getConfigBulk();

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
		if (getConfig("autoSaveCloud") && hasConfigChanged(originalConfig, getConfigBulk())) {
			event.preventDefault();
			try {
				console.log("Settings changed, auto-saving to cloud...");
				await saveCloud(true);
				settingsWindow?.destroy();
			} catch (error) {
				console.error("Error saving config before closing:", error);
				settingsWindow?.destroy();
			}
		}

		settingsWindow = undefined;
	});
}

export async function hotreloadLocale<IPCHandle>() {
	await initLocalization();
	if (settingsWindow) settingsWindow.webContents.reload();
}

export async function reloadWindow<IPCHandle>() {
	if (settingsWindow) settingsWindow.webContents.reload();
}
