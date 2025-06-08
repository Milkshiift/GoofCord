import { app } from "electron";
import "v8-compile-cache";
import pc from "picocolors";
import { getConfig, loadConfig } from "./config.ts";
import { initLocalization } from "./modules/localization.ts";
import { getDisplayVersion, isDev } from "./utils.ts";

console.time(pc.green("[Timer]") + " GoofCord fully loaded in");

if (isDev()) {
  require("source-map-support").install();
}

console.log("GoofCord", getDisplayVersion());

/*
   ! Do not use getConfig or i (localization) in this file
*/
setFlags();
if (!app.requestSingleInstanceLock()) app.exit();

async function main() {
  await loadConfig();
  await initLocalization();

  // Not in loader.ts because it may load too late
  if (getConfig("forceDedicatedGPU")) app.commandLine.appendSwitch("force_high_performance_gpu");

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
    "EnableDrDc",
    "CanvasOopRasterization",
    "UseSkiaRenderer",
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
    ["enable-gpu-rasterization"],
    ["enable-zero-copy"],
    ["disable-low-res-tiling"],
    ["disable-site-isolation-trials"],
    ["enable-hardware-overlays", "single-fullscreen,single-on-top,underlay"],
    ["autoplay-policy", "no-user-gesture-required"],
    ["enable-speech-dispatcher"],
    ["disable-http-cache"], // Work around https://github.com/electron/electron/issues/40777
    ["gtk-version", "3"], // https://github.com/electron/electron/issues/46538
    // disable renderer backgrounding to prevent the app from unloading when in the background
    ["disable-renderer-backgrounding"],
    ["disable-background-timer-throttling"],
    ["disable-disable-backgrounding-occluded-windows"],
    ["disable-features", disableFeatures.join(",")],
    ["enable-features", enableFeatures.join(",")],
  ];

  for (const [key, val] of switches) {
    app.commandLine.appendSwitch(key, val);
  }
}

main().catch(console.error);
