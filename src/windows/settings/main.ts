import path from "node:path";
import { BrowserWindow, ipcMain, shell } from "electron";
import { i } from "../../modules/localization.ts";
import { dirname, getAsset, getCustomIcon, getDisplayVersion, userDataPath } from "../../utils.ts";

export let settingsWindow: BrowserWindow;
let isOpen = false;

ipcMain.handle("openFolder", async (_event, folder: string) => await shell.openPath(path.join(userDataPath, `/${folder}/`)));

export async function createSettingsWindow<IPCHandle>() {
	if (isOpen) {
		settingsWindow.show();
		settingsWindow.restore();
		return;
	}

	console.log("Creating a settings window.");
	settingsWindow = new BrowserWindow({
		width: 660,
		height: 670,
		title: i("settingsWindow-title") + getDisplayVersion(),
		darkTheme: true,
		frame: true,
		icon: getCustomIcon(),
		backgroundColor: "#2f3136",
		autoHideMenuBar: true,
		webPreferences: {
			sandbox: false,
			preload: path.join(dirname(), "windows/settings/preload.mjs"),
			nodeIntegrationInSubFrames: false,
		},
	});
	isOpen = true;

	settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	await settingsWindow.loadURL(`file://${getAsset("html/settings.html")}`);

	settingsWindow.on("close", () => {
		isOpen = false;
	});
}
