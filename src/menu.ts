import {app, BrowserWindow, Menu} from "electron";
import contextMenu from "electron-context-menu";
import {cycleThroughPasswords} from "./modules/messageEncryption";
import {createSettingsWindow} from "./settings/main";
import {mainWindow} from "./window";
import {i} from "./modules/localization";

export async function setMenu() {
	void setApplicationMenu();
	setContextMenu();
}

export async function setApplicationMenu() {
	const template: Electron.MenuItemConstructorOptions[] = [
		{
			label: "GoofCord",
			submenu: [
				{ label: i("menu-goofcord-about"), role: "about" },
				{ type: "separator" },
				{
					label: i("menu-goofcord-settings"),
					accelerator: "CmdOrCtrl+Shift+'",
					click: () => {
						createSettingsWindow();
					},
				},
				{
					label: i("menu-goofcord-cyclePasswords"),
					accelerator: "F9",
					click: async () => {
						cycleThroughPasswords();
					},
				},
				{
					label: i("menu-goofcord-reload"),
					accelerator: "CmdOrCtrl+R",
					click: async () => {
						mainWindow.reload();
					},
				},
				{
					label: i("menu-goofcord-restart"),
					accelerator: "Shift+CmdOrCtrl+R",
					click: async () => {
						app.relaunch();
						app.exit();
					},
				},
				{
					label: i("menu-goofcord-fullScreen"),
					role: "togglefullscreen",
				},
				{
					label: i("menu-goofcord-quit"),
					accelerator: "CmdOrCtrl+Q",
					click: () => {
						app.exit();
					},
				},
			],
		},
		{
			label: i("menu-edit"),
			submenu: [
				{ label: i("menu-edit-undo"), accelerator: "CmdOrCtrl+Z", role: "undo" },
				{ label: i("menu-edit-redo"), accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
				{ type: "separator" },
				{ label: i("menu-edit-cut"), accelerator: "CmdOrCtrl+X", role: "cut" },
				{ label: i("menu-edit-copy"), accelerator: "CmdOrCtrl+C", role: "copy" },
				{ label: i("menu-edit-paste"), accelerator: "CmdOrCtrl+V", role: "paste" },
				{ label: i("menu-edit-selectAll"), accelerator: "CmdOrCtrl+A", role: "selectAll" },
			],
		},
		{
			label: i("menu-zoom"),
			submenu: [
				// Fix for zoom in on keyboards with dedicated + like QWERTZ (or numpad)
				// See https://github.com/electron/electron/issues/14742 and https://github.com/electron/electron/issues/5256
				{ label: i("menu-zoom-in"), accelerator: "CmdOrCtrl+Plus", role: "zoomIn", visible: false },
				{ label: i("menu-zoom-in"), accelerator: "CmdOrCtrl++", role: "zoomIn" },
				{ label: i("menu-zoom-in"), accelerator: "CmdOrCtrl+=", role: "zoomIn", visible: false },
				{ label: i("menu-zoom-out"), accelerator: "CmdOrCtrl+-", role: "zoomOut" },
			],
		},
		{
			label: i("menu-development"),
			submenu: [
				{
					label: i("menu-development-devtools"),
					accelerator: "CmdOrCtrl+Shift+I",
					click: () => {
						BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools();
					},
				},
				{
					label: i("menu-development-gpuDebug"),
					accelerator: "CmdorCtrl+Alt+G",
					click() {
						const gpuWindow = new BrowserWindow({
							width: 900,
							height: 700,
							useContentSize: true,
							title: "GPU Internals",
						});
						gpuWindow.loadURL("chrome://gpu");
					},
				},
			],
		},
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function setContextMenu() {
	contextMenu({
		showSelectAll: true,
		showSaveImageAs: true,
		showCopyImage: true,
		showCopyImageAddress: true,
		showCopyLink: true,
		showSaveLinkAs: true,
		showInspectElement: true,
		showSearchWithGoogle: true,
		showSearchWithDuckDuckGo: true,
	});
}
