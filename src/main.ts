import {app, crashReporter, net, session} from "electron";
import "v8-compile-cache";
import AutoLaunch from "auto-launch";
import {getConfig, loadConfig} from "./config";
import {isDev} from "./utils";
import {createTray} from "./tray";
import {setMenu} from "./menu";

if (isDev()) {
    try {
        import("source-map-support/register");
    } catch (e) {}
}

console.time("GoofCord fully loaded in:");

setFlags();

if (!app.requestSingleInstanceLock()) app.exit();

crashReporter.start({uploadToServer: false});

loadConfig().then(async () => {
    if (getConfig("autoscroll")) app.commandLine.appendSwitch("enable-blink-features", "MiddleClickAutoscroll");
    setAutoLaunchState();
    setMenu();

    await app.whenReady();

    createTray();
    setPermissions();
    await checkForConnectivity();
    console.timeEnd("GoofCord fully loaded in:");
});

async function checkForConnectivity() {
    while (!net.isOnline()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await (await import("./loader")).load();
}

async function setAutoLaunchState() {
    const gfAutoLaunch = new AutoLaunch({name: "GoofCord"});
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
    app.commandLine.appendSwitch("enable-features", "WebRTC,VaapiVideoDecodeLinuxGL,VaapiVideoDecoder,VaapiVideoEncoder,WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport,EnableDrDc,CanvasOopRasterization,UseSkiaRenderer");
    app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
}
