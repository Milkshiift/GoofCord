import {app, crashReporter, net, session} from "electron";
import "v8-compile-cache";
import AutoLaunch from "auto-launch";
import {getConfig, loadConfig} from "./config";
import {isDev} from "./utils";
import {createTray} from "./tray";
import {setMenu} from "./menu";
import {initEncryption} from "./modules/messageEncryption";
import {initializeFirewall, unstrictCSP} from "./modules/firewall";
import {categorizeScripts} from "./scriptLoader/scriptPreparer";
import {registerIpc} from "./ipc";

if (isDev()) {
    try {
        import("source-map-support/register");
    } catch (e) {}
}

console.time("GoofCord fully loaded in");

void setFlags();

if (!app.requestSingleInstanceLock()) app.exit();

crashReporter.start({uploadToServer: false});

loadConfig().then(async () => {
    if (getConfig("autoscroll")) app.commandLine.appendSwitch("enable-blink-features", "MiddleClickAutoscroll");
    void setAutoLaunchState();
    void setMenu();
    void createTray();
    void initEncryption();
    void categorizeScripts();
    void registerIpc();

    // app.whenReady takes a lot of time so if there's something that doesn't need electron to be ready, do it before
    await app.whenReady();

    await Promise.all([
        setPermissions(),
        unstrictCSP(),
        initializeFirewall()
    ]);
    await checkForConnectivity();
    console.timeEnd("GoofCord fully loaded in");
});

async function checkForConnectivity() {
    while (!net.isOnline()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const loader = await import("./loader");
    await loader.load();
}

async function setAutoLaunchState() {
    console.log("Process execution path: " + process.execPath);
    let gfAutoLaunch: AutoLaunch;
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
    session.fromPartition("some-partition").setPermissionRequestHandler((_webContents, permission, callback) => {
        if (permission === "notifications") callback(true);
        if (permission === "media") callback(true);
    });
}

async function setFlags() {
    app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
    app.commandLine.appendSwitch("disable-features", "" +
        "OutOfBlinkCors," +
        "UseChromeOSDirectVideoDecoder," +
        "WinRetrieveSuggestionsOnlyOnDemand," + // Work around electron 13 bug w/ async spellchecking on Windows.
        "HardwareMediaKeyHandling," + // Prevent Discord from registering as a media service.
        "MediaSessionService," + //         ⤴
        "WidgetLayering," + // Fix dev tools layers
        "WebRtcAllowInputVolumeAdjustment," +
        "Vulkan"
    );
    app.commandLine.appendSwitch("enable-features", "WebRTC,WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport,EnableDrDc,CanvasOopRasterization,UseSkiaRenderer");
    if (process.platform === "linux") {
        app.commandLine.appendSwitch("enable-features", "PulseaudioLoopbackForScreenShare,VaapiVideoDecoder,VaapiVideoEncoder,VaapiVideoDecodeLinuxGL");
        if (process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland") {
            // Maybe unnecessary, but I didn't find a concrete proof of that
            app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");
        }
    }
}
