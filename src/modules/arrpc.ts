import path from "node:path";
import { Worker } from "node:worker_threads";
import { dialog } from "electron";
import { getConfig } from "../config.ts";
import { dirname, getGoofCordFolderPath } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let worker: Worker | undefined;

export async function initArrpc<IPCHandle>() {
	if (worker) {
		await worker.terminate();
		worker = undefined;
	}
	if (!getConfig("arrpc")) return;

	try {
		worker = new Worker(path.join(dirname(), "./modules/arrpcWorker.js"), {
			workerData: {
				detectablePath: getGoofCordFolderPath() + "/detectable.json"
			},
		} as object);

		worker.on("message", (e: { eventType: string; }) => {
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
				message: e.message
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