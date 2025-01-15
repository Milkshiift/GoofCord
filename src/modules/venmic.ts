import { createRequire } from "node:module";
import type { LinkData, PatchBay } from "@vencord/venmic";
import { app } from "electron";
import { getAsset } from "../utils.ts";
import pc from "picocolors";

let patchBay: typeof PatchBay;
let venmic: PatchBay;
export let hasPipewirePulse = false;

export async function initVenmic() {
	try {
		patchBay = (createRequire(import.meta.url)(getAsset(`venmic-${process.arch}.node`)) as typeof import("@vencord/venmic")).PatchBay;
		venmic = new patchBay();
		hasPipewirePulse = patchBay.hasPipeWire();
	} catch (e: unknown) {
		console.error("Failed to import venmic", e);
	}
}

function getRendererAudioServicePid() {
	return app.getAppMetrics().find((proc) => proc.name === "Audio Service")?.pid?.toString() ?? "owo";
}

export function venmicList() {
	const audioPid = getRendererAudioServicePid();
	return venmic.list(["node.name"]).filter((s) => s["application.process.id"] !== audioPid);
}

export function venmicStartSystem() {
	const pid = getRendererAudioServicePid();

	// A totally awesome config made by trial and error that hopefully works for most cases.
	// only_speakers is disabled because with it enabled Venmic only captured the output of EasyEffects.
	// Couldn't get Bitwig Studio captured no matter what I tried :(
	const data: LinkData = {
		include: [
			{ "media.class": "Stream/Output/Audio" },
		],
		exclude: [
			{ "application.process.id": pid },
			{ "media.class": "Stream/Input/Audio" }
		],
		only_speakers: false,
		ignore_devices: true,
		only_default_speakers: false,
	};

	return venmic.link(data);
}

export function stopVenmic<IPCHandle>() {
	console.log(pc.cyan("[Screenshare]"), "Stopping Venmic...");
	venmic.unlink();
}