import {ipcMain, safeStorage} from "electron";
import {mainWindow} from "./window";
import {getDisplayVersion, getVersion, packageVersion} from "./utils";
import {createSettingsWindow} from "./settings/main";
import {decryptMessage, encryptMessage} from "./modules/messageEncryption";
import {
    cachedConfig,
    getConfig,
    setConfig,
    setConfigBulk
} from "./config";
import {setBadgeCount} from "./modules/dynamicIcon";

export async function registerIpc() {
    ipcMain.handle("window:Maximize", () => {
        mainWindow.maximize();
    });
    ipcMain.handle("window:IsMaximized", () => {
        return mainWindow.isMaximized();
    });
    ipcMain.handle("window:Minimize", () => {
        mainWindow.minimize();
    });
    ipcMain.handle("window:Unmaximize", () => {
        mainWindow.unmaximize();
    });
    ipcMain.handle("window:Show", () => {
        mainWindow.show();
    });
    ipcMain.handle("window:Hide", () => {
        mainWindow.hide();
    });
    ipcMain.handle("window:Quit", () => {
        mainWindow.close();
    });
    ipcMain.on("config:getConfig", (event, toGet) => {
        event.returnValue = getConfig(toGet);
    });
    ipcMain.on("config:getConfigBulk", (event) => {
        event.returnValue = cachedConfig;
    });
    ipcMain.handle("config:setConfig", async (_event, entry, value) => {
        await setConfig(entry, value);
    });
    ipcMain.handle("config:setConfigBulk", async (_event, object) => {
        await setConfigBulk(object);
    });
    ipcMain.on("getAppVersion", (event) => {
        event.returnValue = getVersion();
    });
    ipcMain.on("displayVersion", (event) => {
        event.returnValue = getDisplayVersion();
    });
    ipcMain.on("getPackageVersion", (event) => {
        event.returnValue = packageVersion;
    });
    ipcMain.handle("flashTitlebar", (_event, color: string) => {
        if (!mainWindow) return;
        mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebar("${color}")`);
    });
    ipcMain.handle("flashTitlebarWithText", (_event, color: string, text: string) => {
        if (!mainWindow) return;
        mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("${color}", "${text}")`);
    });
    ipcMain.handle("openSettingsWindow", async () => {
        await createSettingsWindow();
    });
    ipcMain.on("encryptMessage", (event, message: string) => {
        event.returnValue = encryptMessage(message);
    });
    ipcMain.on("decryptMessage", (event, message: string) => {
        event.returnValue = decryptMessage(message);
    });
    ipcMain.handle("encryptSafeStorage", async (_event, plaintextPassword: string) => {
        return safeStorage.encryptString(plaintextPassword).toString("base64");
    });
    ipcMain.handle("setBadgeCount", (_event, count) => {
        setBadgeCount(count);
    });
}
