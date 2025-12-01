import path from "node:path";
import { BrowserWindow, desktopCapturer, ipcMain, screen, session } from "electron";
import pc from "picocolors";
import { hasPipewirePulse, initVenmic, venmicList, venmicStartSystem } from "../../modules/venmic.ts";
import { dirname, getAsset } from "../../utils.ts";

let capturerWindow: BrowserWindow;
const isWayland = process.platform === "linux" && (process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || !!process.env.WAYLAND_DISPLAY);
if (isWayland) console.log(`You are using ${pc.greenBright("Wayland")}! >ᴗ<`);

export function registerScreenshareHandler() {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { width, height } = primaryDisplay.workAreaSize;

	session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
		const sources = await desktopCapturer.getSources({
			types: ["screen", "window"],
		});
		if (!sources) return callback({});

		sources.forEach((source) => {
			if (!source.name) source.name = "unknown";
		});

		capturerWindow = new BrowserWindow({
			width: width,
			height: height,
			transparent: true,
			resizable: false,
			frame: false,
			autoHideMenuBar: true,
			webPreferences: {
				sandbox: false,
				preload: path.join(dirname(), "windows/screenshare/preload.mjs"),
			},
		});
		capturerWindow.center();
		capturerWindow.maximize();

		await capturerWindow.loadURL(`file://${getAsset("html/picker.html")}`);
		capturerWindow.webContents.send("getSources", sources);

		ipcMain.handleOnce("selectScreenshareSource", async (_event, id, name, audio, contentHint, resolution, framerate) => {
			capturerWindow.close();

			console.info(`${pc.green("[selectScreenshare]")} values are:\nid:${id}\nname:${name}\naudio:${audio}\nresolution:${resolution}\nframerate:${framerate}`);

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
