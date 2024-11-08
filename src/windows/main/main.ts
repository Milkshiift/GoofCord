import fs from "node:fs/promises";
import * as path from "node:path";
import { BrowserWindow, app, ipcMain, shell } from "electron";
import pc from "picocolors";
import { getConfig } from "../../config.ts";
import { getUserAgent } from "../../modules/agent.ts";
import { initArrpc } from "../../modules/arrpc.ts";
import { adjustWindow } from "../../modules/windowStateManager.ts";
import { dirname, getAsset, getCustomIcon } from "../../utils.ts";
import { registerCustomHandler } from "../screenshare/main.ts";

export let mainWindow: BrowserWindow;

export async function createMainWindow() {
	console.log(`${pc.blue("[Window]")} Opening window...`);
	const transparency: boolean = getConfig("transparency");
	mainWindow = new BrowserWindow({
		title: "GoofCord",
		show: true,
		darkTheme: true,
		icon: getCustomIcon(),
		frame: !getConfig("customTitlebar"),
		autoHideMenuBar: true,
		backgroundColor: transparency ? "#00000000" : "#313338",
		transparent: transparency,
		backgroundMaterial: transparency ? "acrylic" : "none",
		webPreferences: {
			sandbox: false,
			preload: path.join(dirname(), "windows/main/preload.mjs"),
			nodeIntegrationInSubFrames: false,
			enableWebSQL: false,
			spellcheck: getConfig("spellcheck"),
			enableBlinkFeatures: getConfig("autoscroll") ? "MiddleClickAutoscroll" : undefined,
		},
	});

	adjustWindow(mainWindow, "windowState:main1");
	if (getConfig("startMinimized")) mainWindow.hide();
	await doAfterDefiningTheWindow();
}

async function doAfterDefiningTheWindow() {
	console.log(`${pc.blue("[Window]")} Setting up window...`);

	// Set the user agent for the web contents based on the Chrome version.
	mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);

	void mainWindow.loadURL(getConfig("discordUrl"));

	mainWindow.on("close", (event) => {
		if (getConfig("minimizeToTray") || process.platform === "darwin") {
			event.preventDefault();
			mainWindow.hide();
		}
	});
	subscribeToAppEvents();
	setWindowOpenHandler();
	registerCustomHandler();
	void initYoutubeAdblocker();
	void initArrpc();
}

let subscribed = false;
function subscribeToAppEvents() {
	if (subscribed) return;
	subscribed = true;
	app.on("second-instance", () => {
		mainWindow.restore();
		mainWindow.show();
	});
	app.on("activate", () => {
		mainWindow.show();
	});
	ipcMain.handle("window:Maximize", () => mainWindow.maximize());
	ipcMain.handle("window:IsMaximized", () => mainWindow.isMaximized());
	ipcMain.handle("window:Minimize", () => mainWindow.minimize());
	ipcMain.handle("window:Unmaximize", () => mainWindow.unmaximize());
	ipcMain.handle("window:Show", () => mainWindow.show());
	ipcMain.handle("window:Hide", () => mainWindow.hide());
	ipcMain.handle("window:Quit", () => mainWindow.close());
	ipcMain.handle("flashTitlebar", (_event, color: string) => {
		void mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebar("${color}")`);
	});
	ipcMain.handle("flashTitlebarWithText", (_event, color: string, text: string) => {
		void mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("${color}", "${text}")`);
	});
}

function setWindowOpenHandler() {
	// Define a handler for opening new windows.
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (url === "about:blank") return { action: "allow" }; // For Vencord's quick css
		if (url.includes("discord.com/popout")) {
			// Allow Discord voice chat popout
			return {
				action: "allow",
				overrideBrowserWindowOptions: {
					frame: true,
					autoHideMenuBar: true,
					icon: getCustomIcon(),
					backgroundColor: "#313338",
					alwaysOnTop: getConfig("popoutWindowAlwaysOnTop"),
					webPreferences: {
						sandbox: true,
					},
				},
			};
		}
		if (["http", "mailto:", "spotify:", "steam:", "com.epicgames.launcher:", "tidal:", "itunes:"].some((prefix) => url.startsWith(prefix))) void shell.openExternal(url);
		return { action: "deny" };
	});
}

async function initYoutubeAdblocker() {
	const adblocker = await fs.readFile(getAsset("adblocker.js"), "utf8");
	mainWindow.webContents.on("frame-created", (_, { frame }) => {
		frame.once("dom-ready", () => {
			if (frame.url.includes("youtube.com/embed/") || (frame.url.includes("discordsays") && frame.url.includes("youtube.com"))) {
				frame.executeJavaScript(adblocker);
			}
		});
	});
}
