import path from "node:path";
import { app } from "electron";
import { AudioSharePatchbay, type ShareableNode } from "patchcord";
import pc from "picocolors";

/**
 * Creates a stateful matcher that intelligently tracks applications across restarts.
 * It starts with a Process ID, but "learns" binary and application names
 * from matching nodes to survive process restarts.
 */
function createMatcher(initialPids: number[]) {
	const pids = new Set(initialPids);
	const binaries = new Set<string>();
	const appNames = new Set<string>();

	return ({ processId, binary, applicationName }: ShareableNode) => {
		const match =
			(processId && pids.has(processId)) ||
			(binary && binaries.has(binary)) ||
			(applicationName && appNames.has(applicationName));

		if (match) {
			if (processId) pids.add(processId);
			if (binary) binaries.add(binary);
			if (applicationName) appNames.add(applicationName);
		}

		return !!match;
	};
}

let patchbay: AudioSharePatchbay | undefined;
export let hasPipewirePulse = false;

let isSharing = false;
let nodeFilter: ((node: ShareableNode) => boolean) | undefined;
let isUpdating = false;
let debounceTimer: NodeJS.Timeout | undefined;
let fallbackInterval: NodeJS.Timeout | undefined;

export async function initPatchcord() {
	if (patchbay || process.argv.includes("--no-patchcord")) return;

	try {
		patchbay = new AudioSharePatchbay({
			command: app.isPackaged
				? path.join(process.resourcesPath, "binaries", "patchcord")
				: path.join(app.getAppPath(), "..", "assets", "native", `patchcord-linux-${process.arch}`),
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
			debounceTimer = setTimeout(updateAudioRoutes, 200);
		});

		patchbay.on("monitorDied", () => {
			if (!isSharing || fallbackInterval) return;
			console.warn(pc.yellow("[Screenshare]"), "System audio monitor died. Falling back to polling.");
			fallbackInterval = setInterval(updateAudioRoutes, 3000);
		});

		hasPipewirePulse = await patchbay.hasPipeWire();
	} catch (e) {
		console.error("Failed to import/init patchcord", e);
		hasPipewirePulse = false;
	}
}

export async function patchcordList(): Promise<ShareableNode[]> {
	await initPatchcord();
	if (!patchbay) return [];

	const audioPid = app.getAppMetrics().find((p) => p.name === "Audio Service")?.pid;
	const nodes = await patchbay.listShareableNodes(false);

	// Exclude GoofCord's own audio renderer to prevent feedback loops
	return nodes.filter((n) => n.processId !== audioPid);
}

async function updateAudioRoutes() {
	if (!isSharing || !patchbay || isUpdating || !nodeFilter) return;

	isUpdating = true;
	try {
		const nodes = await patchcordList();

		// State may have been wiped during the await
		if (!isSharing || !patchbay || !nodeFilter) return;

		const targetNodes = nodes.filter(nodeFilter);

		if (targetNodes.length > 0) {
			console.log(pc.cyan("[Screenshare]"), pc.white("Routing audio for:"), pc.green(targetNodes.map((n) => n.displayName).join(", ")));
		} else {
			console.log(pc.cyan("[Screenshare]"), pc.dim("No active audio sources found to route."));
		}

		await patchbay.routeNodes(targetNodes.map((n) => n.id));
	} catch (err) {
		console.error(pc.red("[Screenshare] Failed to update dynamic audio routes:"), err);
	} finally {
		isUpdating = false;
	}
}

/**
 * Starts sharing system audio.
 * @param excludePids Array of process IDs that should not be captured
 */
export async function patchcordStartSystem(excludePids: number[] = []) {
	const isExcluded = createMatcher(excludePids);
	nodeFilter = (node) => !isExcluded(node);
	return startPatchcordSession();
}

/**
 * Starts sharing audio for specific applications.
 * @param targetPids Array of process IDs of the applications to share
 */
export async function patchcordStartApp(targetPids: number[]) {
	nodeFilter = createMatcher(targetPids);
	return startPatchcordSession();
}

async function startPatchcordSession() {
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
		nodeFilter = undefined;
		return null;
	}
}

export async function stopPatchcord<IPCHandler>() {
	const pb = patchbay;
	if (!pb) return;

	console.log(pc.cyan("[Screenshare]"), "Stopping Patchcord...");

	isSharing = false;
	nodeFilter = undefined;
	patchbay = undefined;

	clearTimeout(debounceTimer);
	clearInterval(fallbackInterval);
	fallbackInterval = undefined;

	await pb.dispose().catch(() => {});
}

app.on("before-quit", (event) => {
	const pb = patchbay;
	if (!pb) return;

	event.preventDefault();
	console.log(pc.cyan("[Screenshare]"), "Cleaning up virtual sinks before exit...");

	patchbay = undefined;
	isSharing = false;

	Promise.race([
		pb.dispose(),
		new Promise((resolve) => setTimeout(resolve, 1500))
	])
		.catch((err) => console.error("Dispose failed:", err))
		.finally(() => app.quit());
});