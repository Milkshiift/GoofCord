import * as path from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import pc from "picocolors";
import { getConfig } from "../../config.ts";
import { spoofChrome } from "../../modules/chromeSpoofer.ts";
import { adjustWindow } from "../../modules/windowStateManager.ts";
import { dirname, getCustomIcon } from "../../utils.ts";
import { registerScreenshareHandler } from "../screenshare";
// @ts-expect-error
import adblocker from "./scripts/adblocker.js" with { type: "text" };

export let mainWindow: BrowserWindow;

export async function createMainWindow() {
	if (process.argv.some((arg) => arg === "--headless")) return;

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
			sandbox: true,
			preload: path.join(dirname(), "windows/main/preload/preload.js"),
			spellcheck: getConfig("spellcheck"),
			enableBlinkFeatures: getConfig("autoscroll") ? "MiddleClickAutoscroll" : undefined,
		},
	});

	adjustWindow(mainWindow, "windowState:main");
	if (getConfig("startMinimized")) mainWindow.hide();
	await doAfterDefiningTheWindow();
}

async function doAfterDefiningTheWindow() {
	console.log(`${pc.blue("[Window]")} Setting up window...`);

	void spoofChrome(mainWindow);

	void mainWindow.loadURL(getConfig("discordUrl"));

	mainWindow.on("close", (event) => {
		if (getConfig("minimizeToTray") || process.platform === "darwin") {
			event.preventDefault();
			mainWindow.hide();
		}
	});

	if (getConfig("staticTitle")) {
		mainWindow.on("page-title-updated", (event) => {
			event.preventDefault();
		});
	}

	const spellcheckLanguages = getConfig("spellcheckLanguages");
	if (spellcheckLanguages) {
		mainWindow.webContents.session.setSpellCheckerLanguages(spellcheckLanguages);
	}

	subscribeToAppEvents();
	setWindowOpenHandler();
	registerScreenshareHandler();
	void initYoutubeAdblocker();
}

let subscribed = false;
function subscribeToAppEvents() {
	if (subscribed) return;
	subscribed = true;
	app.on("second-instance", (_event, cmdLine, _cwd, _data) => {
		const keybind = cmdLine.find((x) => x.startsWith("--keybind"));
		if (keybind !== undefined) {
			const action = keybind.split("=")[1];
			const keyup: boolean = keybind.startsWith("--keybind-up=") || keybind.startsWith("--keybind=");
			if (action !== undefined) {
				mainWindow.webContents.send("keybinds:trigger", action, keyup);
			}
		} else {
			mainWindow.restore();
			mainWindow.show();
		}
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
	mainWindow.webContents.on("frame-created", (_, { frame }) => {
		if (!frame) return;
		frame.once("dom-ready", () => {
			if (frame.url.includes("youtube.com/embed/") || (frame.url.includes("discordsays") && frame.url.includes("youtube.com"))) {
				frame.executeJavaScript(adblocker);
			}
		});
	});
}
