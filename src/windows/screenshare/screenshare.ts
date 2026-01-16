import path from "node:path";
import { BrowserWindow, desktopCapturer, ipcMain, screen, session } from "electron";
import pc from "picocolors";
import { hasPipewirePulse, initVenmic, venmicList, venmicStartSystem } from "../../modules/native/venmic.ts";
import { dirname, isWayland, relToAbs } from "../../utils.ts";
import html from "./renderer/screenshare.html";

let capturerWindow: BrowserWindow;

export function registerScreenshareHandler() {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { width, height } = primaryDisplay.workAreaSize;

	session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
		const sources = await desktopCapturer.getSources({
			types: ["screen", "window"],
		});
		if (!sources) return callback({});

		for (const source of sources) {
			if (!source.name) source.name = "unknown";
		}

		capturerWindow = new BrowserWindow({
			width: width,
			height: height,
			transparent: true,
			resizable: false,
			frame: false,
			autoHideMenuBar: true,
			webPreferences: {
				sandbox: true,
				preload: path.join(dirname(), "windows/screenshare/preload/preload.js"),
			},
		});
		capturerWindow.center();
		capturerWindow.maximize();

		await capturerWindow.loadFile(relToAbs(html.index));
		capturerWindow.webContents.send("getSources", sources);

		ipcMain.handleOnce("selectScreenshareSource", async (_event, id, name, audio, contentHint, resolution, framerate) => {
			capturerWindow.close();

			if (!id) return callback({});

			// src/window/main/screenshare.ts
			await request.frame?.executeJavaScript(`
				window.screenshareSettings = ${JSON.stringify({ resolution: resolution, framerate: framerate, contentHint: contentHint })};
            `);

			const result = isWayland || id === "0" ? sources[0] : { id, name, width: 9999, height: 9999 };
			if (audio) {
				if (process.platform === "linux") {
					await initVenmic();
					if (hasPipewirePulse) {
						console.log(pc.cyan("[Screenshare]"), "Starting Venmic...");
						console.log(
							pc.cyan("[Screenshare]"),
							"Available sources:",
							// Comment out "map" if you need more details for Venmic poking
							venmicList()
								.map((s) => (s["media.class"] === "Stream/Output/Audio" ? s["application.name"] : undefined))
								.filter(Boolean),
						);
						venmicStartSystem();
						callback({ video: result });
						return;
					}
				}
				callback({ video: result, audio: "loopback" });
				return;
			}
			callback({ video: result });
		});
	});
}
