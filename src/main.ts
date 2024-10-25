import { app } from "electron";
import "v8-compile-cache";
import pc from "picocolors";
import { loadConfig } from "./config.ts";
import { initLocalization } from "./modules/localization.ts";
import { getDisplayVersion, isDev } from "./utils.ts";

console.log("GoofCord", getDisplayVersion());

/*
   ! Do not use getConfig or i (localization) in this file
*/
setFlags();
if (isDev()) import("source-map-support/register").catch();
if (!app.requestSingleInstanceLock()) app.exit();

async function main() {
	console.time(pc.green("[Timer]") + " GoofCord fully loaded in");

	await loadConfig();
	await initLocalization();

	const loader = await import("./loader");
	await loader.load();
}

function setFlags() {
	const disableFeatures = ["OutOfBlinkCors", "UseChromeOSDirectVideoDecoder", "HardwareMediaKeyHandling", "MediaSessionService", "WebRtcAllowInputVolumeAdjustment", "Vulkan"];
	const enableFeatures = ["WebRTC", "WebRtcHideLocalIpsWithMdns", "PlatformHEVCEncoderSupport", "EnableDrDc", "CanvasOopRasterization", "UseSkiaRenderer"];
	if (process.platform === "linux") enableFeatures.push("PulseaudioLoopbackForScreenShare", "VaapiVideoDecoder", "VaapiVideoEncoder", "VaapiVideoDecodeLinuxGL");
	app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
	app.commandLine.appendSwitch("enable-speech-dispatcher");
	app.commandLine.appendSwitch("disable-features", disableFeatures.join(","));
	app.commandLine.appendSwitch("enable-features", enableFeatures.join(","));
}

main().catch(console.error);
