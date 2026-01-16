// @ts-expect-error
import venmicPath from "native-module:../../../assets/native/venmic-*.node";
import { createRequire } from "node:module";
// biome-ignore lint/suspicious/noTsIgnore: Venmic may not be installed on all platforms
// @ts-ignore
import type { LinkData, PatchBay } from "@vencord/venmic";
import { app } from "electron";
import pc from "picocolors";

const require = createRequire(import.meta.url);

let patchBay: typeof PatchBay;
let venmic: PatchBay;
export let hasPipewirePulse = false;

export async function initVenmic() {
	if (process.argv.some((arg) => arg === "--no-venmic") || patchBay !== undefined || !venmicPath) return;
	try {
		const binding = require(venmicPath) as typeof import("@vencord/venmic");

		patchBay = binding.PatchBay;
		venmic = new patchBay();
		hasPipewirePulse = patchBay.hasPipeWire();
	} catch (e: unknown) {
		console.error("Failed to import venmic", e);
	}
}

function getRendererAudioServicePid() {
	return (
		app
			.getAppMetrics()
			.find((proc) => proc.name === "Audio Service")
			?.pid?.toString() ?? "owo"
	);
}

export function venmicList() {
	if (!venmic) return [];
	const audioPid = getRendererAudioServicePid();
	return venmic.list(["node.name"]).filter((s) => s["application.process.id"] !== audioPid);
}

export function venmicStartSystem() {
	if (!venmic) return;
	const pid = getRendererAudioServicePid();

	// A totally awesome config made by trial and error that hopefully works for most cases.
	// only_speakers is disabled because with it enabled Venmic only captured the output of EasyEffects.
	// Couldn't get Bitwig Studio captured no matter what I tried :(
	const data: LinkData = {
		include: [{ "media.class": "Stream/Output/Audio" }],
		exclude: [{ "application.process.id": pid }, { "media.class": "Stream/Input/Audio" }],
		only_speakers: false,
		ignore_devices: true,
		only_default_speakers: false,
	};

	return venmic.link(data);
}

export function stopVenmic<IPCHandle>() {
	if (!venmic) return;
	console.log(pc.cyan("[Screenshare]"), "Stopping Venmic...");
	venmic.unlink();
}
