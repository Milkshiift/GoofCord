import module from "node:module";
import { initLocalization } from "@root/src/stores/localization/localization.main.ts";
import { app } from "electron";
import pc from "picocolors";
import { getConfig, loadConfig } from "./stores/config/config.main.ts";
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
	if (!getConfig("hardwareAcceleration")) {
		app.disableHardwareAcceleration();
		console.log(pc.red("[!]") + " Hardware acceleration is: " + app.isHardwareAccelerationEnabled());
	}
	await initLocalization();

	const loader = await import("./loader");
	await loader.load();
}

function setFlags() {
	if (process.argv.includes("--no-flags")) return;

	const enableFeatures = new Set(["WebRTC", "WebRtcHideLocalIpsWithMdns", "PlatformHEVCEncoderSupport", "TransportCallback", "AudioServiceOutOfProcess"]);

	const disableFeatures = new Set(["UseChromeOSDirectVideoDecoder", "HardwareMediaKeyHandling", "MediaSessionService", "WebRtcAllowInputVolumeAdjustment", "Vulkan", "PaintHolding", "DestroyProfileOnBrowserClose"]);

	const switches = new Map<string, string | null>([
		["autoplay-policy", "no-user-gesture-required"],
		["enable-speech-dispatcher", null],
		// Prevent app unloading when backgrounded
		["disable-renderer-backgrounding", null],
		["disable-background-timer-throttling", null],
		["disable-disable-backgrounding-occluded-windows", null],

		["enable-quic", null],
		["enable-tcp-fast-open", null],
	]);

	if (process.platform === "linux") {
		enableFeatures.add("PulseaudioLoopbackForScreenShare");
		enableFeatures.add("WaylandLinuxDrmSyncobj");

		const noVaapi = process.argv.includes("--no-vaapi");
		if (!noVaapi) {
			enableFeatures.add("AcceleratedVideoDecodeLinuxGL");
			enableFeatures.add("AcceleratedVideoEncoder");
			enableFeatures.add("AcceleratedVideoDecoder");
			enableFeatures.add("AcceleratedVideoDecodeLinuxZeroCopyGL");
		}
	}

	if (process.platform === "win32") {
		disableFeatures.add("CalculateNativeWinOcclusion");
	}

	if (getConfig("performanceFlags")) {
		console.log(pc.red("[!]") + " Setting performance switches");
		enableFeatures.add("CanvasOopRasterization");

		switches.set("ignore-gpu-blocklist", null);
		switches.set("enable-gpu-rasterization", null);
		switches.set("enable-zero-copy", null);
		switches.set("disable-low-res-tiling", null);
		switches.set("disable-site-isolation-trials", null);
		switches.set("enable-hardware-overlays", "single-fullscreen,single-on-top,underlay");
		switches.set("enable-native-gpu-memory-buffers", null);
	}

	if (getConfig("disableGpuCompositing")) {
		switches.set("disable-gpu-compositing", null);
	}

	if (getConfig("forceDedicatedGPU")) {
		switches.set("force_high_performance_gpu", null);
	}

	if (disableFeatures.size > 0) {
		app.commandLine.appendSwitch("disable-features", Array.from(disableFeatures).join(","));
	}

	if (enableFeatures.size > 0) {
		app.commandLine.appendSwitch("enable-features", Array.from(enableFeatures).join(","));
	}

	for (const [flag, value] of switches) {
		if (value === null) {
			app.commandLine.appendSwitch(flag);
		} else {
			app.commandLine.appendSwitch(flag, value);
		}
	}
}

main().catch(console.error);
