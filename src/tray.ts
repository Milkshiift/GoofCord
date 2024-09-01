import {app, Menu, nativeImage, Tray} from "electron";
import {createSettingsWindow} from "./settings/main";
import {getCustomIcon, getDisplayVersion} from "./utils";
import {mainWindow} from "./window";
import {i} from "./modules/localization";

export let tray: Tray;
export async function createTray() {
	const trayImage = nativeImage.createFromPath(getCustomIcon());

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
			label: i("tray-openGoofcord"),
			click: () => {
				mainWindow.show();
			},
		},
		{
			label: i("tray-openSettings"),
			click: () => {
				createSettingsWindow();
			},
		},
		{
			type: "separator",
		},
		{
			label: i("tray-quitGoofcord"),
			click: () => {
				app.exit();
			},
		},
	]);

	await app.whenReady();

	if (process.platform === "darwin") {
		app.dock.setMenu(contextMenu);
	} else {
		tray = new Tray(trayImage);
		tray.setContextMenu(contextMenu);
		tray.setToolTip("GoofCord");
		tray.on("click", () => {
			mainWindow.show();
		});
	}
}
