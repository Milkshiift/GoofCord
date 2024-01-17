import {app, ipcMain, safeStorage} from "electron";
import {mainWindow} from "./window";
import {getDisplayVersion, getVersion, packageVersion} from "./utils";
import {createSettingsWindow} from "./settings/main";
import {decryptMessage, encryptMessage} from "./modules/messageEncryption";
import {getConfig, setConfigBulk} from "./config/config";

export function registerIpc() {
    ipcMain.on("window:Maximize", () => {
        mainWindow.maximize();
    });
    ipcMain.on("window:IsMaximized", (event) => {
        event.returnValue = mainWindow.isMaximized();
    });
    ipcMain.on("window:Minimize", () => {
        mainWindow.minimize();
    });
    ipcMain.on("window:Unmaximize", () => {
        mainWindow.unmaximize();
    });
    ipcMain.on("window:Show", () => {
        mainWindow.show();
    });
    ipcMain.on("window:Hide", () => {
        mainWindow.hide();
    });
    ipcMain.on("window:Quit", () => {
        app.exit();
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
    ipcMain.on("restart", () => {
        app.relaunch();
        app.exit();
    });
    ipcMain.on("saveSettings", async (_event, args) => {
        await setConfigBulk(args);
    });
    ipcMain.on("minimizeToTraySetting", async (event) => {
        event.returnValue = await getConfig("minimizeToTray");
    });
    ipcMain.on("flashTitlebar", async (_event, color: string) => {
        await mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebar("${color}")`);
    });
    ipcMain.on("flashTitlebarWithText", async (_event, color: string, text: string) => {
        await mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("${color}", "${text}")`);
    });
    ipcMain.on("openSettingsWindow", async () => {
        await createSettingsWindow();
    });
    ipcMain.handle("encryptMessage", async (event, message: string) => {
        return encryptMessage(message);
    });
    ipcMain.on("decryptMessage", async (event, message: string) => {
        event.returnValue = decryptMessage(message);
    });
    ipcMain.handle("encryptSafeStorage", async (event, plaintextPassword: string) => {
        return safeStorage.encryptString(plaintextPassword).toString("latin1");
    });
    ipcMain.handle("decryptSafeStorage", async (event, encryptedPassword: string) => {
        return safeStorage.decryptString(Buffer.from(encryptedPassword, "latin1"));
    });
    ipcMain.on("isVencordPresent", async (event) => {
        event.returnValue = await mainWindow.webContents.executeJavaScript("window.Vencord !== undefined");
    });
    ipcMain.on("getUserDataPath", (event) => {
        event.returnValue = app.getPath("userData");
    });
}
