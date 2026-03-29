import path from "node:path";

import { app } from "electron";
import { AudioSharePatchbay, type ShareableNode } from "patchcord";
import pc from "picocolors";

let patchbay: AudioSharePatchbay | undefined;
export let hasPipewirePulse = false;

let isSharing = false;
let isUpdatingRoutes = false;
let debounceTimer: NodeJS.Timeout | undefined;
let fallbackInterval: NodeJS.Timeout | undefined;

function getBinaryPath() {
	if (app.isPackaged) {
		return path.join(process.resourcesPath, "binaries", "patchcord");
	} else {
		return path.join(app.getAppPath(), "..", "assets", "native", `patchcord-linux-${process.arch}`);
	}
}

export async function initPatchcord() {
	if (process.argv.some((arg) => arg === "--no-patchcord") || patchbay !== undefined) return;

	try {
		patchbay = new AudioSharePatchbay({
			command: getBinaryPath(),
			sinkPrefix: "goofcord-share",
			sinkDescription: "GoofCord Screen Share",
			virtualMic: true,
			virtualMicName: "goofcord-virtual-mic",
			virtualMicDescription: "GoofCord-Virtual-Mic",
		});

		patchbay.on("graphChanged", () => {
			if (!isSharing) return;
			console.log(pc.cyan("[Screenshare]"), pc.dim("System audio graph changed, refreshing routes..."));

			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => updateAudioRoutes(), 200);
		});

		patchbay.on("monitorDied", () => {
			if (!isSharing || fallbackInterval) return;
			console.warn(pc.yellow("[Screenshare]"), "System audio monitor died. Falling back to polling.");
			fallbackInterval = setInterval(updateAudioRoutes, 3000);
		});

		hasPipewirePulse = await patchbay.hasPipeWire();
	} catch (e: unknown) {
		console.error("Failed to import/init patchcord", e);
		hasPipewirePulse = false;
	}
}

function getRendererAudioServicePid(): number | undefined {
	const pidStr = app.getAppMetrics().find((proc) => proc.name === "Audio Service")?.pid;
	return pidStr ? Number(pidStr) : undefined;
}

export async function patchcordList(): Promise<ShareableNode[]> {
	if (!patchbay) return [];

	const audioPid = getRendererAudioServicePid();
	const nodes = await patchbay.listShareableNodes(false);

	return nodes.filter((n) => n.processId !== audioPid);
}

async function updateAudioRoutes() {
	if (!isSharing || !patchbay || isUpdatingRoutes) return;

	isUpdatingRoutes = true;
	try {
		const shareableNodes = await patchcordList();
		if (!isSharing || !patchbay) return;

		const nodeIds = shareableNodes.map((n) => n.id);

		if (nodeIds.length > 0) {
			console.log(pc.cyan("[Screenshare]"), pc.white("Routing audio for:"), pc.green(shareableNodes.map((n) => n.displayName).join(", ")));
		} else {
			console.log(pc.cyan("[Screenshare]"), pc.dim("No active audio sources found to route."));
		}

		await patchbay.routeNodes(nodeIds);
	} catch (err) {
		console.error(pc.red("[Screenshare] Failed to update dynamic audio routes:"), err);
	} finally {
		isUpdatingRoutes = false;
	}
}

export async function patchcordStartSystem() {
	await initPatchcord();
	if (!patchbay || !hasPipewirePulse) return null;

	console.log(pc.cyan("[Screenshare]"), "Starting Patchcord...");

	try {
		const sinkInfo = await patchbay.ensureVirtualSink();

		isSharing = true;
		await updateAudioRoutes();

		return sinkInfo.virtualMicDescription;
	} catch (err) {
		console.error("Patchcord failed to route nodes:", err);
		isSharing = false;
		return null;
	}
}

export async function stopPatchcord<IPCHandler>() {
	const pb = patchbay;
	if (!pb) return;

	console.log(pc.cyan("[Screenshare]"), "Stopping Patchcord...");

	isSharing = false;
	patchbay = undefined;

	clearTimeout(debounceTimer);
	if (fallbackInterval) {
		clearInterval(fallbackInterval);
		fallbackInterval = undefined;
	}

	await pb.dispose().catch(() => {});
}

app.on("before-quit", (event) => {
	const pb = patchbay;
	if (pb) {
		event.preventDefault();
		patchbay = undefined;
		console.log(pc.cyan("[Screenshare]"), "Cleaning up virtual sinks before exit...");

		pb.dispose()
			.catch((err) => console.error("Dispose failed:", err))
			.finally(() => app.quit());
	}
});
