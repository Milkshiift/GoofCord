import { Worker } from "node:worker_threads";
import { dialog } from "electron";
import { getConfig } from "../config.ts";
import { getGoofCordFolderPath } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

const workerString = `
	import { parentPort, workerData } from "node:worker_threads";
	import Server from "arrpc";
	
	const server = await new Server(workerData.detectablePath);
	const Bridge = await import("arrpc/src/bridge.js");
	
	server.on("activity", (data) => Bridge.send(data));
	server.on("invite", (code) => {
		parentPort?.postMessage({
			eventType: "showMainWindow",
		});
		Bridge.send({
			cmd: "INVITE_BROWSER",
			args: {
				code: code,
			},
		});
	});
`;

let worker: Worker | undefined;
export async function initArrpc<IPCHandle>() {
	if (worker) {
		await worker.terminate();
		worker = undefined;
	}
	if (!getConfig("arrpc")) return;

	try {
		worker = new Worker(workerString, {
			eval: true,
			workerData: {
				detectablePath: getGoofCordFolderPath() + "/detectable.json",
			},
		} as object);

		worker.on("message", (e: { eventType: string }) => {
			const { eventType } = e;
			if (eventType === "showMainWindow") {
				mainWindow.show();
			}
		});

		worker.on("error", (e: Error) => {
			console.error("The arRPC worker encountered a fatal error:", e);
			dialog.showMessageBox(mainWindow, {
				type: "error",
				title: "GoofCord was unable to start arRPC (Rich Presence)",
				message: e.message,
			});
			worker?.terminate();
			worker = undefined;
		});

		worker.on("exit", (code) => {
			if (code !== 0) console.error(`arRPC worker stopped unexpectedly with exit code: ${code}`);
			worker = undefined;
		});
	} catch (e) {
		console.error("Failed to start arRPC worker:", e);
		worker = undefined;
	}
}
