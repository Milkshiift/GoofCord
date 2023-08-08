// Modules to control application life and create native browser window
import { app, BrowserWindow, crashReporter, session } from "electron";
import path from "path";
import "v8-compile-cache";
import { checkConfig, checkIfConfigExists, getConfig, installModLoader } from "./utils";
import "./extensions/mods";
import "./tray";
import { createCustomWindow } from "./window";
import "./modules/updateCheck";

export var iconPath: string;
export var clientName = "GoofCord";

app.on("render-process-gone", (event, webContents, details) => {
    if (details.reason == "crashed") {
        app.relaunch();
    }
});

if (!app.requestSingleInstanceLock()) {
    // kill if 2nd instance
    app.quit();
}

// Your data now belongs to CCP
crashReporter.start({uploadToServer: false});

setFlags();
checkConfig();
checkIfConfigExists();

app.whenReady().then(async () => {
    iconPath = path.join(__dirname, "../", "/assets/ac_icon_transparent.png");

    await createCustomWindow();

    if ((await getConfig("modName")) != "none") {
        await installModLoader();
    }
    session.fromPartition("some-partition").setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === "notifications") {
            // Approves the permissions request
            callback(true);
        }
        if (permission === "media") {
            // Approves the permissions request
            callback(true);
        }
    });
    app.on("activate", async function () {
        if (BrowserWindow.getAllWindows().length === 0) await createCustomWindow();
    });
});

async function setFlags() {
    const isUnix = process.platform !== "win32" && process.platform !== "darwin";
    const isWayland = process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || process.env["WAYLAND_DISPLAY"] !== undefined;
    const isWaylandNative =
        isWayland &&
        (process.argv.includes("--ozone-platform=wayland") ||
            process.argv.includes("--ozone-hint=auto") ||
            process.argv.includes("--ozone-hint=wayland"));

    // WinRetrieveSuggestionsOnlyOnDemand: Work around electron 13 bug w/ async spellchecking on Windows.
    // HardwareMediaKeyHandling,MediaSessionService: Prevent Discord from registering as a media service.
    app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors,UseChromeOSDirectVideoDecoder,WinRetrieveSuggestionsOnlyOnDemand,HardwareMediaKeyHandling,MediaSessionService");
    app.commandLine.appendSwitch("enable-features", "WebRTC,VaapiVideoDecoder,VaapiVideoEncoder");
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
