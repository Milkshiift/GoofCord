import path from "node:path";

import { hasPipewirePulse, patchcordList, patchcordStartApp, patchcordStartSystem } from "@root/src/modules/native/patchcord.ts";
// Windows WASAPI EXCLUDE-tree echo fix (the #46 fix). Additive 3-way audio gate:
// Linux patchcord → win32 native exclude-tree → universal "loopback" fallback.
import { tryStartWasapiLoopback } from "@root/src/modules/native/wasapiLoopback.ts";
import { BrowserWindow, desktopCapturer, ipcMain, session } from "electron";
import type { ShareableNode } from "patchcord";
import pc from "picocolors";

import { dirname, isWayland, relToAbs } from "../../utils.ts";
import html from "./renderer/screenshare.html";

interface ActiveRequest {
	callback: (res: any) => void;
	window: BrowserWindow;
	frame: any;
	initialPromise?: Promise<any>;
}

const activeRequests = new Map<number, ActiveRequest>();

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
		const req = activeRequests.get(event.sender.id);
		if (!req) return;

		activeRequests.delete(event.sender.id);
		const { callback, window, frame } = req;

		if (!id) {
			try { callback({}); } catch { /* Ignore missing video error */ }
			if (!window.isDestroyed()) window.close();
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
			} else if (process.platform === "win32" && (await tryStartWasapiLoopback())) {
				// Windows native WASAPI EXCLUDE-tree capture started (the #46 echo fix).
				// Do NOT also request Chromium "loopback" here. The addon is already running its OWN
				// WASAPI loopback capture, and a SECOND concurrent WASAPI loopback (Chromium's) fighting
				// over the same shared Windows audio session corrupts it → CoreMessaging.dll heap-
				// corruption HARD CRASH on system-audio shares (confirmed: crash only with wasapi ON +
				// system audio; Chromium loopback alone and the addon alone are each fine). Leaving
				// result.audio unset means Chromium captures NO audio; the swap seam adds the
				// reconstructed exclude-tree track to the (audio-less) stream — the addon is the sole
				// capturer (and the seam discarded Chromium's loopback track anyway, so nothing is lost).
			} else {
				result.audio = "loopback";
				console.log(pc.cyan("[Screenshare]"), "WASAPI process-loopback unsupported on this build, using loopback fallback");
			}
		}

		callback(result);
		if (!window.isDestroyed()) window.close();
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

		const initialPromise = fetchScreenshareData(false);
		initialPromise.catch(() => {
			// Close and clean up if getSources errors
			if (!capturerWindow.isDestroyed()) capturerWindow.close();
		});

		activeRequests.set(wcId, { callback, window: capturerWindow, frame: request.frame, initialPromise });

		capturerWindow.once("closed", () => {
			if (activeRequests.has(wcId)) {
				activeRequests.delete(wcId);
				try { callback({}); } catch { /* Ignore missing video error */ }
			}
		});

		capturerWindow.center();
		void capturerWindow.loadFile(relToAbs(html.index));
	});
}
