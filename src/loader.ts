import { runMigrations } from "@root/src/migration.ts";
import { setContextMenu } from "@root/src/modules/menus/contextMenu.ts";
import { app, net, session, systemPreferences } from "electron";
import pc from "picocolors";
import { registerAllHandlers } from "./ipc/gen.ts";
import { initArrpc } from "./modules/arrpc/arrpc.ts";
import { manageAssets, updateAssets } from "./modules/assets/assetDownloader.ts";
import { categorizeAllAssets, startStyleWatcher } from "./modules/assets/assetLoader.ts";
import { initFirewall, unstrictCSP } from "./modules/firewall.ts";
import { initProxy } from "./modules/proxy.ts";
import { setApplicationMenu } from "./modules/menus/applicationMenu.ts";
import { initEncryption } from "./modules/messageEncryption.ts";
import { createTray } from "./modules/tray.ts";
import { checkForUpdate } from "./modules/updateCheck.ts";
import { firstLaunch, getConfig } from "./stores/config/config.main.ts";
import { isDev } from "./utils.ts";
import { createMainWindow } from "./windows/main/main.ts";
import { createSettingsWindow } from "./windows/settings/settings.ts";

export async function load() {
	void setAutoLaunchState();
	void setApplicationMenu();
	void createTray();
	await runMigrations();

	await waitForInternetConnection();

	const modPromise = manageAssets().then(async (assetsMissing) => {
		if (assetsMissing) await updateAssets();
		await categorizeAllAssets();
	});
	registerAllHandlers();
	initEncryption();

	console.time(pc.green("[Timer]") + " Electron loaded in");
	await app.whenReady();
	console.timeEnd(pc.green("[Timer]") + " Electron loaded in");

	setPermissions();
	await initProxy();
	initFirewall();
	unstrictCSP();
	await modPromise;
	firstLaunch ? await createSettingsWindow() : await createMainWindow();

	console.timeEnd(pc.green("[Timer]") + " GoofCord fully loaded in");

	void setContextMenu();
	void updateAssets();
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

export async function setAutoLaunchState<IPCHandle>() {
	const { default: AutoLaunch } = await import("auto-launch");
	const isAUR = process.execPath.endsWith("electron") && !isDev();
	const gfAutoLaunch = new AutoLaunch({
		name: "GoofCord",
		path: isAUR ? "/bin/goofcord" : undefined,
	});

	getConfig("launchWithOsBoot") ? await gfAutoLaunch.enable() : await gfAutoLaunch.disable();
}

function setPermissions() {
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
