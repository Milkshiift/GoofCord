import {app, crashReporter, net, session} from "electron";
import "v8-compile-cache";
import "./tray";
import {createMainWindow} from "./window";
import {checkForUpdate} from "./modules/updateCheck";
import AutoLaunch from "auto-launch";
import {categorizeScripts, installDefaultScripts} from "./scriptLoader/scriptPreparer";
import {unstrictCSP} from "./modules/firewall";
import {installModLoader} from "./modules/extensions";
import {checkConfig} from "./config/configChecker";
import {getConfig} from "./config/config";

crashReporter.start({uploadToServer: false});

setFlags();

if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(async () => {
    await checkConfig();

    const gfAutoLaunch = new AutoLaunch({name: "GoofCord"});
    if (await getConfig("launchWithOsBoot")) {
        gfAutoLaunch.enable();
    } else {
        gfAutoLaunch.disable();
    }

    const retry = setInterval(async () => {
        if (net.isOnline()) { // Wait until the user is online
            clearInterval(retry);
            load();
        }
    });
});

async function load() {
    categorizeScripts();
    installDefaultScripts();
    unstrictCSP();

    if ((await getConfig("modName")) != "none") installModLoader();

    await createMainWindow();

    if (await getConfig("updateNotification")) checkForUpdate();

    session.fromPartition("some-partition").setPermissionRequestHandler((_webContents, permission, callback) => {
        if (permission === "notifications") callback(true);
        if (permission === "media") callback(true);
    });
}

// Flag setting is pretty broken because some need to be command line arguments and can't be set with appendSwitch. 20% works as intended.
async function setFlags() {
    const isUnix = process.platform !== "win32" && process.platform !== "darwin";
    const isWayland = process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || process.env["WAYLAND_DISPLAY"] !== undefined;
    const isWaylandNative = isWayland && (process.argv.includes("--ozone-platform=wayland"));
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
    app.commandLine.appendSwitch("webrtc-max-cpu-consumption-percentage", "100"); // For reducing screenshare stutters

    if (await getConfig("autoscroll")) {
        app.commandLine.appendSwitch("enable-blink-features", "MiddleClickAutoscroll");
    }

    const presets = {
        performance: "--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan --force_high_performance_gpu", // Performance
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
