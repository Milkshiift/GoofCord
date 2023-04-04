import {app, BrowserWindow, clipboard, ipcMain, shell} from "electron";
import {getConfig, getLang, getConfigLocation, getDisplayVersion, getVersion, setConfigBulk, Settings, sleep} from "../utils";
import path from "path";
import os from "os";
import fs from "fs";
import {crash} from "process";

let settingsWindow: BrowserWindow;
let instance: number = 0;
//checkForDataFolder();
const userDataPath = app.getPath("userData");
const storagePath = path.join(userDataPath, "/storage/");
const themesPath = path.join(userDataPath, "/themes/");
const pluginsPath = path.join(userDataPath, "/plugins/");

export function createSettingsWindow() {
    console.log("Creating a settings window.");
    instance = instance + 1;
    if (instance > 1) {
        if (settingsWindow) {
            settingsWindow.show();
            settingsWindow.restore();
        }
    } else {
        settingsWindow = new BrowserWindow({
            width: 660,
            height: 670,
            title: `GoofCord Settings | Version: ${getDisplayVersion()}`,
            darkTheme: true,
            frame: true,
            backgroundColor: "#2f3136",
            autoHideMenuBar: true,
            webPreferences: {
                sandbox: true,
                preload: path.join(__dirname, "preload.js"),
                nodeIntegration: false,
                webviewTag: true,
                nodeIntegrationInSubFrames: false,
                webSecurity: true,
                allowRunningInsecureContent: false,
                plugins: false,
                experimentalFeatures: false
            }
        });

        async function settingsLoadPage() {
            await settingsWindow.loadURL(`file://${__dirname}/settings.html`);
        }

        const userDataPath = app.getPath("userData");
        const themesFolder = userDataPath + "/themes/";
        if (!fs.existsSync(themesFolder)) {
            fs.mkdirSync(themesFolder);
            console.log("Created missing theme folder");
        }
        settingsWindow.webContents.on("did-finish-load", () => {
            fs.readdirSync(themesFolder).forEach((file) => {
                try {
                    const manifest = fs.readFileSync(`${themesFolder}/${file}/manifest.json`, "utf8");
                    const themeFile = JSON.parse(manifest);
                    settingsWindow.webContents.send(
                        "themeLoader",
                        fs.readFileSync(`${themesFolder}/${file}/${themeFile.theme}`, "utf-8")
                    );
                    console.log(`%cLoaded ${themeFile.name} made by ${themeFile.author}`, "color:red");
                } catch (err) {
                    console.error(err);
                }
            });
        });
        ipcMain.on("saveSettings", (event, args: Settings) => {
            console.log(args);
            setConfigBulk(args);
        });
        ipcMain.on("openStorageFolder", async () => {
            shell.showItemInFolder(storagePath);
            await sleep(1000);
        });
        ipcMain.on("openThemesFolder", async () => {
            shell.showItemInFolder(themesPath);
            await sleep(1000);
        });
        ipcMain.on("openPluginsFolder", async () => {
            shell.showItemInFolder(pluginsPath);
            await sleep(1000);
        });
        ipcMain.on("openCrashesFolder", async () => {
            shell.showItemInFolder(path.join(app.getPath("temp"), app.getName() + " Crashes"));
            await sleep(1000);
        });
        ipcMain.on("crash", async () => {
            process.crash();
        });
        ipcMain.handle("getSetting", (event, toGet: string) => {
            return getConfig(toGet);
        });
        ipcMain.on("copyDebugInfo", () => {
            let settingsFileContent = fs.readFileSync(getConfigLocation(), "utf-8");
            clipboard.writeText(
                "**OS:** " +
                    os.platform() +
                    " " +
                    os.version() +
                    "\n**Architecture:** " +
                    os.arch() +
                    "\n**GoofCord version:** " +
                    getVersion() +
                    "\n**Electron version:** " +
                    process.versions.electron +
                    "\n`" +
                    settingsFileContent +
                    "`"
            );
        });
        settingsWindow.webContents.setWindowOpenHandler(({url}) => {
            shell.openExternal(url);
            return {action: "deny"};
        });
        settingsLoadPage();
        settingsWindow.on("close", () => {
            ipcMain.removeHandler("getSetting");
            ipcMain.removeAllListeners("saveSettings");
            instance = 0;
        });
    }
}
