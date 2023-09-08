// Modules to control application life and create native browser window
import {app, crashReporter, net, session} from "electron";
import "v8-compile-cache";
import {
    checkConfig,
    checkIfConfigExists,
    getConfig,
    getConfigSync,
    installModLoader
} from "./utils";
import "./modules/mods";
import "./tray";
import { createCustomWindow } from "./window";
import {checkForUpdate} from "./modules/updateCheck";

setFlags();

app.on("render-process-gone", (event, webContents, details) => {
    if (details.reason == "crashed") app.relaunch();
});

if (!app.requestSingleInstanceLock() && getConfigSync("multiInstance") == (false ?? undefined)) app.quit();

// Your data now belongs to CCP
crashReporter.start({uploadToServer: false});

checkConfig();
checkIfConfigExists();

const AutoLaunch = require('auto-launch');
const gfAutoLauncher = new AutoLaunch({
    name: 'GoofCord',
});
if (getConfigSync("launchWithOsBoot")) {
    gfAutoLauncher.enable();
}
else {
    gfAutoLauncher.disable();
}

app.whenReady().then(async () => {
    const retry = setInterval(async () => {
        if (net.isOnline()) {
            clearInterval(retry);
            await load();
        }
    });
});

async function load() {
    await createCustomWindow();

    if ((await getConfig("modName")) != "none") {
        await installModLoader();
    }

    if (await getConfig("updateNotification")) {
        await checkForUpdate();
    }

    session.fromPartition("some-partition").setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === "notifications") callback(true);
        if (permission === "media") callback(true);
    });
}

async function setFlags() {
    const isUnix = process.platform !== "win32" && process.platform !== "darwin";
    const isWayland = process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || process.env["WAYLAND_DISPLAY"] !== undefined;
    const isWaylandNative =
        isWayland &&
        (process.argv.includes("--ozone-platform=wayland") ||
            process.argv.includes("--ozone-hint=auto") ||
            process.argv.includes("--ozone-hint=wayland"));

    // WinRetrieveSuggestionsOnlyOnDemand:
    // HardwareMediaKeyHandling,MediaSessionService:
    app.commandLine.appendSwitch("disable-features", "" +
        "OutOfBlinkCors," +
        "UseChromeOSDirectVideoDecoder," +
        "WinRetrieveSuggestionsOnlyOnDemand," + // Work around electron 13 bug w/ async spellchecking on Windows.
        "HardwareMediaKeyHandling," + // Prevent Discord from registering as a media service.
        "MediaSessionService," + //         ⤴
        "WidgetLayering" // Fix dev tools layers
    );
    app.commandLine.appendSwitch("enable-features", "WebRTC,VaapiVideoDecoder,VaapiVideoEncoder,WebRtcHideLocalIpsWithMdns");
    app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
    app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100'); // For reducing screenshare stutters

    if (isUnix) {
        if (isWaylandNative) {
            app.commandLine.appendSwitch(
                "enable-features",
                "UseOzonePlatform,WebRTCPipeWireCapturer,WaylandWindowDecorations"
            );
        } else if (isWayland) {
            app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");
        }
    }

    const presets = {
        performance: `--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan --force_high_performance_gpu`, // Performance
        battery: "--enable-features=TurnOffStreamingMediaCachingOnBattery --force_low_power_gpu" // Known to have better battery life for Chromium?
    };
    switch (await getConfig("prfmMode")) {
        case "performance":
            console.log("Performance mode enabled");
            app.commandLine.appendSwitch(presets.performance);
            break;
        case "battery":
            console.log("Battery mode enabled");
            app.commandLine.appendSwitch(presets.battery);
            break;
        default:
            console.log("No performance modes set");
    }
}
