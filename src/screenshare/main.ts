import {BrowserWindow, desktopCapturer, ipcMain, session} from "electron";
import path from "path";
import {getSinks, isAudioSupported} from "./audio";

let capturerWindow: BrowserWindow;

function registerCustomHandler() {
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
        console.log(request);
        if (process.platform == "linux") {
            let isAudio = isAudioSupported();
            if (isAudio) {
                console.log("audio supported");
                getSinks();
            }
        }
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"]
        });
        console.log(sources);
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
        ipcMain.once("selectScreenshareSource", (event, id, name, audio, close) => {
            //console.log(sources[id]);
            //console.log(id);
            capturerWindow.close();
            if (close){
                return;
            }
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
    });
}

registerCustomHandler();
