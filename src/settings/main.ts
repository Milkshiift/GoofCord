import {app, BrowserWindow, ipcMain, shell} from "electron";
import {getCustomIcon, getDisplayVersion} from "../utils";
import path from "path";
import {clearCache} from "../modules/cacheManager";

let settingsWindow: BrowserWindow;
const userDataPath = app.getPath("userData");
let isOpen = false;

ipcMain.handle("clearCache", async (_event, folder: string) => {
    await clearCache();
});
ipcMain.handle("openFolder", async (_event, folder: string) => {
    await shell.openPath(path.join(userDataPath, `/${folder}/`));
});
ipcMain.handle("crash", () => {
    process.crash();
});

export async function createSettingsWindow() {
    if (isOpen) {
        settingsWindow.show();
        settingsWindow.restore();
        return;
    }

    console.log("Creating a settings window.");
    settingsWindow = new BrowserWindow({
        width: 660,
        height: 670,
        title: `GoofCord Settings | Version: ${getDisplayVersion()}`,
        darkTheme: true,
        frame: true,
        icon: getCustomIcon(),
        backgroundColor: "#2f3136",
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: false,
            preload: path.join(__dirname, "/settings/preload.js"),
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            plugins: false,
            contextIsolation: true
        }
    });
    isOpen = true;

    settingsWindow.webContents.setWindowOpenHandler(({url}) => {
        shell.openExternal(url);
        return {action: "deny"};
    });

    await settingsWindow.loadURL(`file://${path.join(__dirname, "/assets/html/settings.html")}`);

    settingsWindow.on("close", () => {
        isOpen = false;
    });
}
