import module from 'node:module';
import { app } from "electron";
import pc from "picocolors";
import { getConfig, loadConfig } from "./config.ts";
import { initLocalization } from "./modules/localization.ts";
import { getDisplayVersion, isDev } from "./utils.ts";

console.time(pc.green("[Timer]") + " GoofCord fully loaded in");

module.enableCompileCache();

if (isDev()) {
  require("source-map-support").install();
}

console.log("GoofCord", getDisplayVersion());

if (!app.requestSingleInstanceLock()) app.exit();

async function main() {
  await loadConfig();
  setFlags(); // Flags should be set as early as possible
  await initLocalization();

  const loader = await import("./loader");
  await loader.load();
}

function setFlags() {
  if (process.argv.some((arg) => arg === "--no-flags")) return;

  const disableFeatures = [
    "UseChromeOSDirectVideoDecoder",
    "HardwareMediaKeyHandling",
    "MediaSessionService",
    "WebRtcAllowInputVolumeAdjustment",
    "Vulkan",
  ];
  const enableFeatures = [
    "WebRTC",
    "WebRtcHideLocalIpsWithMdns",
    "PlatformHEVCEncoderSupport",
  ];

  if (process.platform === "linux") {
    enableFeatures.push("PulseaudioLoopbackForScreenShare");
    if (!process.argv.some((arg) => arg === "--no-vaapi")) {
      enableFeatures.push(
        "AcceleratedVideoDecodeLinuxGL",
        "AcceleratedVideoEncoder",
        "AcceleratedVideoDecoder",
        "AcceleratedVideoDecodeLinuxZeroCopyGL",
      );
    }
  }

  if (process.platform === "win32") {
    disableFeatures.push("CalculateNativeWinOcclusion");
  }

  const switches = [
    ["autoplay-policy", "no-user-gesture-required"],
    ["enable-speech-dispatcher"],
    ["disable-http-cache"], // Work around https://github.com/electron/electron/issues/40777
    // disable renderer backgrounding to prevent the app from unloading when in the background
    ["disable-renderer-backgrounding"],
    ["disable-background-timer-throttling"],
    ["disable-disable-backgrounding-occluded-windows"],
  ];

  if (getConfig("performanceFlags")) {
    console.log("Setting performance switches");
    switches.push(
        ["ignore-gpu-blocklist"],
        ["enable-gpu-rasterization"],
        ["enable-zero-copy"],
        ["disable-low-res-tiling"],
        ["disable-site-isolation-trials"],
        ["enable-hardware-overlays", "single-fullscreen,single-on-top,underlay"],
    );
    enableFeatures.push(
        "EnableDrDc",
        "CanvasOopRasterization",
    )
  }

  if (getConfig("forceDedicatedGPU")) {
    switches.push(["force_high_performance_gpu"]);
  }

  switches.push(["disable-features", disableFeatures.join(",")]);
  switches.push(["enable-features", enableFeatures.join(",")]);

  for (const [key, val] of switches) {
    app.commandLine.appendSwitch(key, val);
  }
}

main().catch(console.error);
