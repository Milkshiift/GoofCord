import {BrowserWindow, desktopCapturer, ipcMain, session, screen} from "electron";
import path from "path";
import {mainWindow} from "../window";

let capturerWindow: BrowserWindow;

function registerCustomHandler() {
    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
        // Maximizing for some reason doesn't work in linux, so we manually set the window dimensions to match the screen's width and height
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        capturerWindow = new BrowserWindow({
            width: width,
            height: height,
            transparent: true,
            resizable: false,
            frame: false,
            autoHideMenuBar: true,
            webPreferences: {
                sandbox: false,
                preload: path.join(__dirname, "preload.js")
            }
        });
        capturerWindow.maximize();

        await capturerWindow.loadURL(`file://${__dirname}/picker.html`);
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"]
        });
        capturerWindow.webContents.send("getSources", sources);

        ipcMain.once("selectScreenshareSource", async (_event, id, name, audio, resolution, framerate) => {
            capturerWindow.close();
            // https://github.com/Milkshiift/GoofCord-Scripts/blob/main/patches/AL10_screenshareQuality.js
            await mainWindow.webContents.executeJavaScript(`
                try{
                    window.ScreenshareQuality.patchScreenshareQuality({
                        framerate: ${framerate},
                        height: ${resolution}
                    })
                } catch(e) {console.log(e);}
            `);

            const result = {id, name, width: 9999, height: 9999};
            if (audio && process.platform === "win32") {
                callback({video: result, audio: "loopback"});
                return;
            }
            callback({video: result});
        });
    });
}
registerCustomHandler();
