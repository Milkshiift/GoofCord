import { Menu, Tray, app, dialog, nativeImage } from "electron";
import { getConfig } from "./config.ts";
import { i } from "./modules/localization.ts";
import { saveState } from "./modules/windowStateManager.ts";
import { getAsset, getCustomIcon, getDisplayVersion } from "./utils.ts";
import { mainWindow } from "./windows/main/main.ts";
import { createSettingsWindow } from "./windows/settings/main.ts";

export let tray: Tray;
export async function createTray() {
	const trayImage = nativeImage.createFromPath(await getTrayIcon());

	const getTrayMenuIcon = () => {
		if (process.platform === "win32") return trayImage.resize({ height: 16 });
		if (process.platform === "linux") return trayImage.resize({ height: 24 });
		if (process.platform === "darwin") return trayImage.resize({ height: 18 });
		return trayImage;
	};

	const contextMenu = Menu.buildFromTemplate([
		{
			label: `GoofCord ${getDisplayVersion()}`,
			icon: getTrayMenuIcon(),
			enabled: false,
		},
		{
			type: "separator",
		},
		{
			label: i("goofcord-open"),
			click: () => {
				if (mainWindow) {
					mainWindow.show();
				} else {
					dialog.showErrorBox("Failed to open the main window", "The main window did not yet initialize. Are you connected to the internet?");
				}
			},
		},
		{
			label: i("goofcord-settings"),
			click: () => {
				createSettingsWindow();
			},
		},
		{
			type: "separator",
		},
		{
			label: i("goofcord-restart"),
			accelerator: "Shift+CmdOrCtrl+R",
			click: async () => {
				await saveState(mainWindow, "windowState:main");
				app.relaunch();
				app.exit();
			},
		},
		{
			label: i("goofcord-quit"),
			click: async () => {
				await saveState(mainWindow, "windowState:main");
				app.exit();
			},
		},
	]);

	await app.whenReady();

	if (process.platform === "darwin") {
		app.dock?.setMenu(contextMenu);
	} else {
		tray = new Tray(trayImage);
		tray.setContextMenu(contextMenu);
		tray.setToolTip("GoofCord");
		tray.on("click", () => {
			mainWindow.show();
		});
	}
}

export async function getTrayIcon() {
	if (getConfig("trayIcon") === "symbolic_black") return getAsset("gf_symbolic_black.png");
	if (getConfig("trayIcon") === "symbolic_white") return getAsset("gf_symbolic_white.png");
	return getCustomIcon();
}
