import path from "node:path";

import { hasPipewirePulse, patchcordList, patchcordStartApp, patchcordStartSystem } from "@root/src/modules/native/patchcord.ts";
import { BrowserWindow, desktopCapturer, ipcMain, session } from "electron";
import type { ShareableNode } from "patchcord";

import { dirname, isWayland, relToAbs } from "../../utils.ts";
import html from "./renderer/screenshare.html";

interface ActiveRequest {
	callback: (res: any) => void;
	window: BrowserWindow;
	frame: any;
	initialPromise?: Promise<any>;
}

const activeRequests = new Map<number, ActiveRequest>();

// Single-owner, exactly-once teardown for a screenshare request.
// The map-delete is the idempotency token: the first caller to reach a live entry
// owns the callback + window close; every later caller (select/cancel vs. the window
// `closed` event racing) hits the `!req` guard and is a no-op. Delete BEFORE the
// callback so a re-entrant `closed` during the callback can't double-fire.
function finishRequest(wcId: number, result: any) {
	const req = activeRequests.get(wcId);
	if (!req) return;
	activeRequests.delete(wcId);
	try {
		req.callback(result);
	} catch {
		// Swallow a throw from the Electron callback so teardown (window close) still completes.
	}
	if (!req.window.isDestroyed()) req.window.close();
}

async function fetchScreenshareData(isRefresh = false) {
	// If it's a manual refresh AND we are on Wayland, skip fetching video sources to prevent re-triggering the OS portal.
	const skipSources = isRefresh && isWayland;

	const [rawSources, audioNodes] = await Promise.all([skipSources ? null : desktopCapturer.getSources({ types: ["screen", "window"], thumbnailSize: { width: 320, height: 180 } }), process.platform === "linux" ? patchcordList().catch(() => [] as ShareableNode[]) : []]);

	return {
		sources:
			rawSources?.map((s) => ({
				id: s.id,
				name: s.name || "unknown",
				thumbnail: s.thumbnail.toDataURL(),
			})) ?? null,
		audioNodes,
		isPatchcord: hasPipewirePulse,
	};
}

export function registerScreenshareHandler() {
	ipcMain.removeHandler("refreshScreenshareSources");
	ipcMain.removeHandler("selectScreenshareSource");
	ipcMain.removeHandler("showScreenshareWindow");

	ipcMain.handle("refreshScreenshareSources", async (event) => {
		const req = activeRequests.get(event.sender.id);

		if (req?.initialPromise) {
			const res = await req.initialPromise;
			req.initialPromise = undefined;
			return res;
		}

		return fetchScreenshareData(true);
	});

	ipcMain.handle("selectScreenshareSource", async (event, id, name, audioConfig, contentHint, resolution, framerate) => {
		const wcId = event.sender.id;
		// Snapshot what we need to read before any `await` — finishRequest owns the
		// delete + callback + close, so we never pre-delete or call the callback here.
		const req = activeRequests.get(wcId);
		if (!req) return;
		const { frame } = req;

		if (!id) {
			finishRequest(wcId, {});
			return;
		}

		if (frame) {
			frame.executeJavaScript(`window.screenshareSettings = ${JSON.stringify({ resolution, framerate, contentHint })};`).catch(() => {});
		}

		const result: any = { video: { id, name, width: 9999, height: 9999 } };

		if (audioConfig.mode !== "none") {
			if (hasPipewirePulse && process.platform === "linux") {
				try {
					await (audioConfig.mode === "system" ? patchcordStartSystem : patchcordStartApp)(audioConfig.pids);
				} catch (err) {
					console.error("[Screenshare] Failed to start patchcord node:", err);
				}
			} else {
				result.audio = "loopback";
			}
		}

		finishRequest(wcId, result);
	});

	ipcMain.handle("showScreenshareWindow", (event) => {
		const req = activeRequests.get(event.sender.id);
		if (req && !req.window.isDestroyed()) {
			req.window.show();
			req.window.focus();
		}
	});

	session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
		const capturerWindow = new BrowserWindow({
			width: 800,
			height: 650,
			minWidth: 600,
			minHeight: 500,
			resizable: true,
			frame: true,
			autoHideMenuBar: true,
			backgroundColor: "#27292e",
			show: false,
			webPreferences: {
				sandbox: true,
				preload: path.join(dirname(), "windows/screenshare/preload/preload.js"),
			},
		});

		const wcId = capturerWindow.webContents.id;

		// Acquiring sources triggers the OS screen-share portal on Wayland — the picker shown
		// *before* our window. If the user dismisses that portal, getSources() rejects (Electron 35+
		// surfaces the dismissal as a failure). Our window is only shown once sources resolve, so on
		// that rejection it would never appear and never close — leaving this request's callback
		// un-fired, which is what blocks Discord from starting a new screenshare. Treat it as a cancel.
		const initialPromise = fetchScreenshareData(false);
		initialPromise.catch(() => finishRequest(wcId, {}));

		activeRequests.set(wcId, { callback, window: capturerWindow, frame: request.frame, initialPromise });

		capturerWindow.once("closed", () => {
			// Idempotent: if select/cancel already ran, the entry is gone and
			// finishRequest is a no-op (its `!req` guard). Otherwise (OS close button /
			// window destroyed mid-request) this is the cancel path.
			finishRequest(wcId, {});
		});

		capturerWindow.center();
		void capturerWindow.loadFile(relToAbs(html.index));
	});
}
