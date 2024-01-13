import {BrowserWindow, desktopCapturer, ipcMain, session, screen} from "electron";
import path from "path";
import {mainWindow} from "../window";

let capturerWindow: BrowserWindow;

function registerCustomHandler() {
    const isLinuxWayland = process.env["XDG_SESSION_TYPE"] === "wayland";
    console.log("Is wayland: ", isLinuxWayland);

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"]
        });

        if (isLinuxWayland) {
            callback({video: {id: sources[0]?.id, name: sources[0]?.name}});
            return;
        }

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

        await capturerWindow.loadURL(`file://${path.join(__dirname, "../", "/assets/html/picker.html")}`);
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