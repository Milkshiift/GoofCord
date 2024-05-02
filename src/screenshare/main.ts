import {BrowserWindow, desktopCapturer, ipcMain, screen, session} from "electron";
import path from "path";
import {mainWindow} from "../window";

let capturerWindow: BrowserWindow;

export async function registerCustomHandler() {
    const isLinuxWayland = process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland";

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"]
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
                preload: path.join(__dirname, "/screenshare/preload.js")
            }
        });
        capturerWindow.maximize();

        await capturerWindow.loadURL(`file://${path.join(__dirname, "/assets/html/picker.html")}`);
        capturerWindow.webContents.send("getSources", sources);

        ipcMain.handleOnce("selectScreenshareSource", async (_event, id, name, audio, resolution, framerate) => {
            capturerWindow.close();
            // https://github.com/Milkshiift/GoofCord-Scripts/blob/1.4.0/patches/10_screenshareQuality.js
            await mainWindow.webContents.executeJavaScript(`
                try{
                    window.ScreenshareQuality.patchScreenshareQuality(${resolution}, ${framerate})
                } catch(e) {console.log(e);}
            `);

            const result = {id, name, width: 9999, height: 9999};
            if (audio) {
                callback({video: isLinuxWayland ? sources[0] : result, audio: "loopbackWithMute"});
                return;
            }
            callback({video: result});
        });
    });
}
