import {app, crashReporter, dialog, net, session, systemPreferences} from "electron";
import "v8-compile-cache";
import {firstLaunch, getConfig, loadConfig} from "./config";
import {getCustomIcon, getGoofCordFolderPath, isDev, tryCreateFolder, userDataPath} from "./utils";
import {createTray} from "./tray";
import {setMenu} from "./menu";
import {initEncryption} from "./modules/messageEncryption";
import {initializeFirewall, unstrictCSP} from "./modules/firewall";
import {categorizeScripts} from "./modules/scriptLoader";
import {registerIpc} from "./ipc";
import chalk from "chalk";
import {createMainWindow} from "./window";
import {checkForUpdate} from "./modules/updateCheck";
import {createSettingsWindow} from "./settings/main";
import fs from "fs/promises";
import path from "path";

setFlags();
if (isDev()) import("source-map-support/register").catch(() => {});
if (!app.requestSingleInstanceLock()) app.exit();
const cloudHost = getConfig("cloudHost");
crashReporter.start({ uploadToServer: false });

async function main() {
    console.time(chalk.green("[Timer]") + " GoofCord fully loaded in");

    await tryCreateFolder(getGoofCordFolderPath());
    await migrateFolders();
    await loadConfig();

    void Promise.all([setAutoLaunchState(), setMenu(), createTray(), categorizeScripts(), registerIpc()]);
    const extensions = await import("./modules/extensions");

    await app.whenReady();

    await Promise.all([waitForInternetConnection(), setPermissions(), unstrictCSP(), initializeFirewall(), extensions.loadExtensions(), initEncryption()]);
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
        message: "Welcome to GoofCord!\nSetup the settings to your liking and restart GoofCord to access Discord.\nYou can do this with Ctrl+Shift+R or through the tray/dock menu.\nHappy chatting!",
        type: "info",
        icon: getCustomIcon(),
        noLink: false
    });
}

async function migrateFolders() {
    try {
        await fs.rename(path.join(userDataPath, "storage/settings.json"), path.join(getGoofCordFolderPath(), "settings.json"));
        await fs.rename(path.join(userDataPath, "extensions"), path.join(getGoofCordFolderPath(), "extensions"));
        await fs.rename(path.join(userDataPath, "scripts"), path.join(getGoofCordFolderPath(), "scripts"));
    } catch (e) {}
}

async function setAutoLaunchState() {
    console.log("Process execution path: " + process.execPath);
    const { default: AutoLaunch } = await import('auto-launch');
    const isAUR = process.execPath.endsWith("electron") && !isDev();
    const gfAutoLaunch = new AutoLaunch({
        name: "GoofCord",
        path: isAUR ? "/bin/goofcord" : undefined
    });

    if (getConfig("launchWithOsBoot")) {
        await gfAutoLaunch.enable();
    } else {
        await gfAutoLaunch.disable();
    }
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
    const check = await fetch(`${cloudHost}/ping`);
    while (!check.ok) {
        console.log("Waiting for internet connection...");
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main().catch(console.error);
