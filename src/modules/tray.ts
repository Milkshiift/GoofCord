import { app, dialog, Menu, nativeImage, Tray } from "electron";
// @ts-expect-error
import symbolicIconBlack from "../../assets/gf_symbolic_black.png";
// @ts-expect-error
import symbolicIconWhite from "../../assets/gf_symbolic_white.png";
import { getConfig } from "../config.ts";
import { getCustomIcon, getDisplayVersion, relToAbs } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";
import { createSettingsWindow } from "../windows/settings/settings.ts";
import { i } from "./localization/localization.main.ts";
import { saveState } from "./windowStateManager.ts";

export let tray: Tray;
export async function createTray() {
	const trayImage = nativeImage.createFromPath(getTrayIcon());

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

export function getTrayIcon() {
	if (getConfig("trayIcon") === "symbolic_black") return relToAbs(symbolicIconBlack);
	if (getConfig("trayIcon") === "symbolic_white") return relToAbs(symbolicIconWhite);
	return getCustomIcon();
}
