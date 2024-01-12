//ipc stuff
import {app, desktopCapturer, ipcMain, safeStorage} from "electron";
import {mainWindow} from "./window";
import {getDisplayVersion, getVersion, packageVersion} from "./utils";
import {createSettingsWindow} from "./settings/main";
import {decryptMessage, encryptMessage} from "./modules/messageEncryption";
import {getConfig, setConfigBulk} from "./config/config";

export function registerIpc() {
    ipcMain.on("win-maximize", () => {
        mainWindow.maximize();
    });
    ipcMain.on("win-isMaximized", (event) => {
        event.returnValue = mainWindow.isMaximized();
    });
    ipcMain.on("win-isNormal", (event) => {
        event.returnValue = mainWindow.isNormal();
    });
    ipcMain.on("win-minimize", () => {
        mainWindow.minimize();
    });
    ipcMain.on("win-unmaximize", () => {
        mainWindow.unmaximize();
    });
    ipcMain.on("win-show", () => {
        mainWindow.show();
    });
    ipcMain.on("win-hide", () => {
        mainWindow.hide();
    });
    ipcMain.on("win-quit", () => {
        app.exit();
    });
    ipcMain.on("get-app-version", (event) => {
        event.returnValue = getVersion();
    });
    ipcMain.on("displayVersion", (event) => {
        event.returnValue = getDisplayVersion();
    });
    ipcMain.on("get-package-version", (event) => {
        event.returnValue = packageVersion;
    });
    ipcMain.on("restart", () => {
        app.relaunch();
        app.exit();
    });
    ipcMain.on("saveSettings", async (_event, args) => {
        await setConfigBulk(args);
    });
    ipcMain.on("minimizeToTray", async (event) => {
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
    ipcMain.handle("DESKTOP_CAPTURER_GET_SOURCES", (_event, opts) => desktopCapturer.getSources(opts));
    ipcMain.on("getUserData", (event) => {
        event.returnValue = app.getPath("userData");
    });
}
