import {BrowserWindow, desktopCapturer, ipcMain, session, screen} from "electron";
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
            ipcMain.once("selectScreenshareSource", async (_event, id, name, audio, resolution, framerate) => {
                capturerWindow.close();
                await mainWindow.webContents.executeJavaScript(`
                    try{
                        window.ScreenshareQuality.patchScreenshareQuality({
                            framerate: ${framerate},
                            height: ${resolution}
                        })
                    } catch(e) {}
                `);

                const result = {id, name, width: 9999, height: 9999};
                if (audio) {
                    if (process.platform === "win32") {
                        callback({video: result, audio: "loopback"});
                    } else {
                        callback({video: result});
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
