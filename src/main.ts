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
import fs from "fs";
import path from "path";
// DIY top level awaits
(async () => {

if (isDev()) {
    try {
        import("source-map-support/register");
    } catch (e: unknown) {}
}
crashReporter.start({uploadToServer: false});
if (!app.requestSingleInstanceLock()) app.exit();

console.time(chalk.green("[Timer]") + " GoofCord fully loaded in");

void setFlags();

await tryCreateFolder(getGoofCordFolderPath());
// Before GoofCord used different folders. This migrates these folders to the new location
// This code should be removed after 2 updates
try {
    await fs.promises.rename(path.join(userDataPath, "storage/settings.json"), path.join(getGoofCordFolderPath(), "settings.json"));
    await fs.promises.rename(path.join(userDataPath, "extensions"), path.join(getGoofCordFolderPath(), "extensions"));
    await fs.promises.rename(path.join(userDataPath, "scripts"), path.join(getGoofCordFolderPath(), "scripts"));
} catch (e) {}

await loadConfig();

if (getConfig("autoscroll")) app.commandLine.appendSwitch("enable-blink-features", "MiddleClickAutoscroll");
void setAutoLaunchState();
void setMenu();
void createTray();
void categorizeScripts();
void registerIpc();
const extensions = await import("./modules/extensions");

// app.whenReady takes a lot of time so if there's something that doesn't need electron to be ready, do it before
await app.whenReady();

void initEncryption();
await Promise.all([
    setPermissions(),
    unstrictCSP(),
    initializeFirewall(),
    extensions.loadExtensions(),
    waitForInternetConnection()
]);

if (firstLaunch) {
    await createSettingsWindow();
    void dialog.showMessageBox({
        message: "Welcome to GoofCord!\nSetup the settings to your liking and restart GoofCord to access Discord.\nYou can do this with Ctrl+Shift+R or through the tray/dock menu.\nHappy chatting!",
        type: "info",
        icon: getCustomIcon(),
        noLink: false
    });
} else {
    await createMainWindow();
}

console.timeEnd(chalk.green("[Timer]") + " GoofCord fully loaded in");

void extensions.updateMods();
void checkForUpdate();

async function waitForInternetConnection() {
    while (!net.isOnline()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function setAutoLaunchState() {
    console.log("Process execution path: " + process.execPath);
    const { default: AutoLaunch } = await import('auto-launch');
    let gfAutoLaunch;
    // When GoofCord is installed from AUR it uses system Electron, which causes IT to launch instead of GoofCord
    if (process.execPath.endsWith("electron") && !isDev()) {
        // Set the launch path to a shell script file that AUR created to properly start GoofCord
        gfAutoLaunch = new AutoLaunch({name: "GoofCord", path: "/bin/goofcord"});
    } else {
        gfAutoLaunch = new AutoLaunch({name: "GoofCord"});
    }
    if (getConfig("launchWithOsBoot")) {
        gfAutoLaunch.enable();
    } else {
        gfAutoLaunch.disable();
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
        } else if (["media", "notifications", "fullscreen", "clipboard-sanitized-write", "idle-detection", "openExternal"].includes(permission)) {
            callback(true);
        }
    });
}

async function setFlags() {
    app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
    app.commandLine.appendSwitch("disable-features", "" +
        "OutOfBlinkCors," +
        "UseChromeOSDirectVideoDecoder," +
        "HardwareMediaKeyHandling," + // Prevent Discord from registering as a media service.
        "MediaSessionService," + //         ⤴
        "WebRtcAllowInputVolumeAdjustment," +
        "Vulkan"
    );
    app.commandLine.appendSwitch("enable-features", "WebRTC,WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport,EnableDrDc,CanvasOopRasterization,UseSkiaRenderer");
    if (process.platform === "linux") {
        app.commandLine.appendSwitch("enable-features", "PulseaudioLoopbackForScreenShare,VaapiVideoDecoder,VaapiVideoEncoder,VaapiVideoDecodeLinuxGL");
    }
}

})();
