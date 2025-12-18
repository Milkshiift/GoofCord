import { app, dialog, net, session, systemPreferences } from "electron";
import pc from "picocolors";
import { firstLaunch, getConfig } from "./config.ts";
import { initArrpc } from "./modules/arrpc.ts";
import { categorizeAllAssets, startStyleWatcher } from "./modules/assetLoader.ts";
import { initFirewall, unstrictCSP } from "./modules/firewall.ts";
import { i } from "./modules/localization.ts";
import { setMenu } from "./modules/menu.ts";
import { initEncryption } from "./modules/messageEncryption.ts";
import { manageMods, updateMods } from "./modules/mods.ts";
import { createTray } from "./modules/tray.ts";
import { checkForUpdate } from "./modules/updateCheck.ts";
import { getCustomIcon, isDev } from "./utils.ts";
import { createMainWindow } from "./windows/main";
import { createSettingsWindow, settingsWindow } from "./windows/settings";

export async function load() {
	void setAutoLaunchState();
	void setMenu();
	void createTray();
	const preReady = Promise.all([import("./ipcGen.ts"), manageMods().then(() => categorizeAllAssets())]);

	console.time(pc.green("[Timer]") + " Electron loaded in");
	await app.whenReady();
	console.timeEnd(pc.green("[Timer]") + " Electron loaded in");

	initEncryption();
	initFirewall();
	await Promise.all([preReady, waitForInternetConnection(), setPermissions(), unstrictCSP()]);
	firstLaunch ? await handleFirstLaunch() : await createMainWindow();

	console.timeEnd(pc.green("[Timer]") + " GoofCord fully loaded in");

	void updateMods();
	void checkForUpdate();
	void initArrpc();
	void startStyleWatcher();

	if (process.argv.some((arg) => arg === "--settings")) void createSettingsWindow();
}

async function waitForInternetConnection() {
	while (!net.isOnline()) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

async function handleFirstLaunch() {
	await createSettingsWindow();
	settingsWindow.once('ready-to-show', async () => {
		await dialog.showMessageBox({
			message: i("welcomeMessage"),
			type: "info",
			icon: getCustomIcon(),
			noLink: false,
		});
		app.relaunch(); // Relaunches only when user closes settings window
	});
}

export async function setAutoLaunchState<IPCHandle>() {
	const { default: AutoLaunch } = await import("auto-launch");
	const isAUR = process.execPath.endsWith("electron") && !isDev();
	const gfAutoLaunch = new AutoLaunch({
		name: "GoofCord",
		path: isAUR ? "/bin/goofcord" : undefined,
	});

	getConfig("launchWithOsBoot") ? await gfAutoLaunch.enable() : await gfAutoLaunch.disable();
}

async function setPermissions() {
	session.defaultSession.setPermissionRequestHandler(async (_webContents, permission, callback, details) => {
		if (process.platform === "darwin" && "mediaTypes" in details) {
			if (details.mediaTypes?.includes("audio")) {
				callback(await systemPreferences.askForMediaAccess("microphone"));
			}
			if (details.mediaTypes?.includes("video")) {
				callback(await systemPreferences.askForMediaAccess("camera"));
			}
		} else if (["media", "notifications", "fullscreen", "clipboard-sanitized-write", "openExternal", "pointerLock", "keyboardLock"].includes(permission)) {
			callback(true);
		}
	});
}
