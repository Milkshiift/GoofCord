import path from "node:path";

import { app } from "electron";
import { AudioSharePatchbay, type ShareableNode } from "patchcord";
import pc from "picocolors";

let patchbay: AudioSharePatchbay | undefined;
export let hasPipewirePulse = false;

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
		hasPipewirePulse = await patchbay.hasPipeWire();
	} catch (e: unknown) {
		console.error("Failed to import/init patchcord", e);
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

export async function patchcordStartSystem() {
	await initPatchcord();
	if (!patchbay || !hasPipewirePulse) return null;

	console.log(pc.cyan("[Screenshare]"), "Starting Patchcord...");

	try {
		const sinkInfo = await patchbay.ensureVirtualSink();

		const shareableNodes = await patchcordList();
		const nodeIds = shareableNodes.map((n) => n.id);

		if (nodeIds.length > 0) {
			console.log(
				pc.cyan("[Screenshare]"),
				"Routing sources:",
				shareableNodes.map((s) => s.displayName),
			);
			await patchbay.routeNodes(nodeIds);
		} else {
			console.log(pc.cyan("[Screenshare]"), "No active audio sources right now. Sink created and waiting.");
		}

		return sinkInfo.virtualMicDescription;
	} catch (err) {
		console.error("Patchcord failed to route nodes:", err);
		return null;
	}
}

export async function stopPatchcord<IPCHandler>() {
	if (!patchbay) return;
	console.log(pc.cyan("[Screenshare]"), "Stopping Patchcord...");

	await patchbay.dispose().catch(() => {});
	patchbay = undefined;
}

app.on("before-quit", (event) => {
	if (patchbay) {
		event.preventDefault();
		console.log(pc.cyan("[Screenshare]"), "Cleaning up virtual sinks before exit...");

		patchbay
			.dispose()
			.catch((err) => console.error("Dispose failed:", err))
			.finally(() => {
				patchbay = undefined;
				app.quit();
			});
	}
});
