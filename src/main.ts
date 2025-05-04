import { app } from "electron";
import "v8-compile-cache";
import pc from "picocolors";
import { loadConfig } from "./config.ts";
import { initLocalization } from "./modules/localization.ts";
import { getDisplayVersion } from "./utils.ts";

console.log("GoofCord", getDisplayVersion());

/*
   ! Do not use getConfig or i (localization) in this file
*/
setFlags();
if (!app.requestSingleInstanceLock()) app.exit();

async function main() {
	console.time(pc.green("[Timer]") + " GoofCord fully loaded in");

	await loadConfig();
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
		"Vulkan"
	];
	const enableFeatures = [
		"WebRTC",
		"WebRtcHideLocalIpsWithMdns",
		"PlatformHEVCEncoderSupport",
		"EnableDrDc",
		"CanvasOopRasterization",
		"UseSkiaRenderer"
	];
	if (process.platform === "linux") enableFeatures.push("PulseaudioLoopbackForScreenShare");
	if (!process.argv.some((arg) => arg === "--no-vaapi")) enableFeatures.push("AcceleratedVideoDecodeLinuxGL", "AcceleratedVideoEncoder", "AcceleratedVideoDecoder", "AcceleratedVideoDecodeLinuxZeroCopyGL");

	app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
	app.commandLine.appendSwitch("enable-speech-dispatcher");
	app.commandLine.appendSwitch("disable-features", disableFeatures.join(","));
	app.commandLine.appendSwitch("enable-features", enableFeatures.join(","));
	app.commandLine.appendSwitch("disable-http-cache");
}

main().catch(console.error);
