import {BrowserWindow, desktopCapturer, ipcMain, session} from "electron";
import path from "path";

let capturerWindow: BrowserWindow;

function registerCustomHandler() {
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
        console.log(request);
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"]
        });
        console.log(sources);
        capturerWindow = new BrowserWindow({
            width: 800,
            height: 600,
            frame: false,
            autoHideMenuBar: true,
            webPreferences: {
                sandbox: false,
                spellcheck: false,
                preload: path.join(__dirname, "preload.js")
            }
        });
        ipcMain.once("selectScreenshareSource", (event, id, name) => {
            //console.log(sources[id]);
            //console.log(id);
            capturerWindow.close();
            const result = {id, name, width: 9999, height: 9999};
            callback({video: result});
        });
        await capturerWindow.loadURL(`file://${__dirname}/picker.html`);
        capturerWindow.webContents.send("getSources", sources);
    });
}

registerCustomHandler();
