import path from "node:path";
import { BrowserWindow, desktopCapturer, ipcMain, screen, session } from "electron";
import pc from "picocolors";
import { dirname, getAsset } from "../../utils.ts";

let capturerWindow: BrowserWindow;
const isWayland = process.platform === "linux" && (process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || !!process.env.WAYLAND_DISPLAY);
if (isWayland) console.log(`You are using ${pc.greenBright("Wayland")}! >ᴗ<`);

export function registerScreenshareHandler() {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { width, height } = primaryDisplay.workAreaSize;

	session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
		let sources = await desktopCapturer.getSources({
			types: ["screen", "window"],
		});
		if (!sources) return callback({});
		if (isWayland) sources = [sources[0]];

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
			// https://github.com/Milkshiift/goofcord-shelter-plugins/tree/main/plugins/screenshare-quality
			await request.frame?.executeJavaScript(`
                try{
                    window.ScreenshareQuality.patchScreenshareQuality(${resolution}, ${framerate})
                } catch(e) {console.log(e);}
                window.contentHint = "${contentHint}";
            `);

			const result = isWayland || id === "0" ? sources[0] : { id, name, width: 9999, height: 9999 };
			if (audio) {
				callback({ video: result, audio: "loopback" });
				return;
			}
			callback({ video: result });
		});
	});
}
