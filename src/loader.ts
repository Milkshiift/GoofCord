import chalk from "chalk";
import { net, app, dialog, session, systemPreferences } from "electron";
import { firstLaunch, getConfig } from "./config";
import { registerIpc } from "./ipc";
import { setMenu } from "./menu";
import { categorizeAllAssets } from "./modules/assetLoader";
import { initializeFirewall, unstrictCSP } from "./modules/firewall";
import { i } from "./modules/localization";
import { initEncryption } from "./modules/messageEncryption";
import { manageMods, updateMods } from "./modules/mods";
import { checkForUpdate } from "./modules/updateCheck";
import { createSettingsWindow } from "./settings/main";
import { createTray } from "./tray";
import { getCustomIcon, isDev } from "./utils";
import { createMainWindow } from "./window";

export async function load() {
	void setAutoLaunchState();
	void setMenu();
	void createTray();
	const preReady = Promise.all([registerIpc(), manageMods().then(() => categorizeAllAssets())]);

	console.time(chalk.green("[Timer]") + " Electron loaded in");
	await app.whenReady();
	console.timeEnd(chalk.green("[Timer]") + " Electron loaded in");

	initEncryption();
	await Promise.all([preReady, waitForInternetConnection(), setPermissions(), unstrictCSP(), initializeFirewall()]);
	firstLaunch ? await handleFirstLaunch() : await createMainWindow();

	console.timeEnd(chalk.green("[Timer]") + " GoofCord fully loaded in");

	await updateMods();
	await checkForUpdate();
}

async function waitForInternetConnection() {
	while (!net.isOnline()) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

async function handleFirstLaunch() {
	await createSettingsWindow();
	await dialog.showMessageBox({
		message: i("welcomeMessage"),
		type: "info",
		icon: getCustomIcon(),
		noLink: false,
	});
}

async function setAutoLaunchState() {
	console.log(`Process execution path: ${process.execPath}`);
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
		} else if (["media", "notifications", "fullscreen", "clipboard-sanitized-write", "openExternal"].includes(permission)) {
			callback(true);
		}
	});
}
