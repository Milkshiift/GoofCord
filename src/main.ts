import { net, app, crashReporter, dialog, session, systemPreferences } from "electron";
import "v8-compile-cache";
import chalk from "chalk";
import { firstLaunch, getConfig, loadConfig } from "./config";
import { registerIpc } from "./ipc";
import { setMenu } from "./menu";
import { categorizeAllAssets } from "./modules/assetLoader";
import { initializeFirewall, unstrictCSP } from "./modules/firewall";
import { i } from "./modules/localization";
import { initEncryption } from "./modules/messageEncryption";
import { checkForUpdate } from "./modules/updateCheck";
import { createSettingsWindow } from "./settings/main";
import { createTray } from "./tray";
import { getCustomIcon, getGoofCordFolderPath, isDev, tryCreateFolder } from "./utils";
import { createMainWindow } from "./window";

setFlags();
if (isDev()) import("source-map-support/register").catch();
if (!app.requestSingleInstanceLock()) app.exit();
crashReporter.start({ uploadToServer: false });

async function main() {
	console.time(chalk.green("[Timer]") + " GoofCord fully loaded in");

	await tryCreateFolder(getGoofCordFolderPath());
	await loadConfig();

	const extensions = await import("./modules/mods");
	const preReady = Promise.all([setAutoLaunchState(), setMenu(), createTray(), registerIpc(), extensions.manageMods().then(categorizeAllAssets)]);

	await app.whenReady();

	await Promise.all([preReady, waitForInternetConnection(), setPermissions(), unstrictCSP(), initializeFirewall(), initEncryption()]);
	firstLaunch ? await handleFirstLaunch() : await createMainWindow();

	console.timeEnd(chalk.green("[Timer]") + " GoofCord fully loaded in");

	await extensions.updateMods();
	await checkForUpdate();
}

function setFlags() {
	const disableFeatures = ["OutOfBlinkCors", "UseChromeOSDirectVideoDecoder", "HardwareMediaKeyHandling", "MediaSessionService", "WebRtcAllowInputVolumeAdjustment", "Vulkan"];
	const enableFeatures = ["WebRTC", "WebRtcHideLocalIpsWithMdns", "PlatformHEVCEncoderSupport", "EnableDrDc", "CanvasOopRasterization", "UseSkiaRenderer"];
	if (process.platform === "linux") enableFeatures.push("PulseaudioLoopbackForScreenShare", "VaapiVideoDecoder", "VaapiVideoEncoder", "VaapiVideoDecodeLinuxGL");
	app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
	app.commandLine.appendSwitch("disable-features", disableFeatures.join(","));
	app.commandLine.appendSwitch("enable-features", enableFeatures.join(","));
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

async function waitForInternetConnection() {
	while (!net.isOnline()) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

main().catch(console.error);
