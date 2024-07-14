import {app, crashReporter, net, session, systemPreferences} from "electron";
import "v8-compile-cache";
import {getConfig, loadConfig} from "./config";
import {isDev} from "./utils";
import {createTray} from "./tray";
import {setMenu} from "./menu";
import {initEncryption} from "./modules/messageEncryption";
import {initializeFirewall, unstrictCSP} from "./modules/firewall";
import {categorizeScripts} from "./modules/scriptLoader";
import {registerIpc} from "./ipc";
import chalk from "chalk";
import {createMainWindow} from "./window";
import {checkForUpdate} from "./modules/updateCheck";

if (isDev()) {
    try {
        import("source-map-support/register");
    } catch (e) {}
}

console.time(chalk.green("[Timer]") + " GoofCord fully loaded in");

void setFlags();

if (!app.requestSingleInstanceLock()) app.exit();

crashReporter.start({uploadToServer: false});

loadConfig().then(async () => {
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

    await createMainWindow();

    console.timeEnd(chalk.green("[Timer]") + " GoofCord fully loaded in");

    void extensions.updateMods();
    void checkForUpdate();
});

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
