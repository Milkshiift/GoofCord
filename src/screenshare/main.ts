import {BrowserWindow, desktopCapturer, ipcMain, session} from "electron";
import path from "path";
import {mainWindow} from "../window";

let capturerWindow: BrowserWindow;

function registerCustomHandler() {
    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"]
        });
        if (process.platform === "linux" && process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland") {
            console.log("WebRTC Capturer detected, skipping window creation."); //assume webrtc capturer is used
            console.log({video: {id: sources[0].id, name: sources[0].name}});
            callback({video: {id: sources[0].id, name: sources[0].name}});
        } else {
            capturerWindow = new BrowserWindow({
                width: 800,
                height: 600,
                transparent: true,
                resizable: false,
                frame: false,
                autoHideMenuBar: true,
                webPreferences: {
                    sandbox: false,
                    spellcheck: false,
                    preload: path.join(__dirname, "preload.js")
                }
            });
            capturerWindow.maximize();
            ipcMain.once("selectScreenshareSource", async (_event, id, name, audio, resolution, framerate) => {
                capturerWindow.close();
                await mainWindow.webContents.executeJavaScript(`if (window.Vencord !== undefined) {window.ScreenshareQuality.patchScreenshareQuality({
                    framerate: ${framerate},
                    height: ${resolution}
                })}`);

                const result = {id, name, width: 9999, height: 9999};
                if (audio) {
                    if (process.platform === "win32") {
                        callback({video: result, audio: "loopback"});
                    }
                } else {
                    callback({video: result});
                }
            });
            await capturerWindow.loadURL(`file://${__dirname}/picker.html`);
            capturerWindow.webContents.send("getSources", sources);
        }
    });
}

registerCustomHandler();
