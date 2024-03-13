import {app, crashReporter, net, session} from "electron";
import "v8-compile-cache";
import AutoLaunch from "auto-launch";
import {getConfig, loadConfig} from "./config";
import {isDev} from "./utils";

if (isDev()) {
    try {
        import("source-map-support/register");
    } catch (e) {}
}

if (!app.requestSingleInstanceLock()) app.exit();

crashReporter.start({uploadToServer: false});

loadConfig().then(async () => {
    setFlags();
    setAutoLaunchState();

    await app.whenReady();

    setPermissions();
    checkForConnectivity();
});

async function checkForConnectivity() {
    while (!net.isOnline()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    import("./loader");
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
        "WebRtcAllowInputVolumeAdjustment"
    );
    app.commandLine.appendSwitch("enable-features", "WebRTC,VaapiVideoDecoder,VaapiVideoEncoder,WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport");
    app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

    if (getConfig("autoscroll")) {
        app.commandLine.appendSwitch("enable-blink-features", "MiddleClickAutoscroll");
    }

    const presets = {
        performance: "--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan --force_high_performance_gpu", // Performance
        battery: "--enable-features=TurnOffStreamingMediaCachingOnBattery --force_low_power_gpu" // Known to have better battery life for Chromium?
    };
    switch (getConfig("prfmMode")) {
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
