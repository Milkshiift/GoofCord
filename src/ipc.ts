import { app, ipcMain, safeStorage } from "electron";
import { cachedConfig, getConfig, getDefaultValue, setConfig, setConfigBulk } from "./config";
import { setBadgeCount } from "./modules/dynamicIcon";
import { decryptMessage, encryptMessage } from "./modules/messageEncryption";
import { createSettingsWindow } from "./settings/main";
import { getDisplayVersion, getVersion, packageVersion } from "./utils";
import { mainWindow } from "./window";

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
	ipcMain.on("config:getDefaultValue", (event, setting) => {
		event.returnValue = getDefaultValue(setting);
	});
	ipcMain.on("getAppVersion", (event) => {
		event.returnValue = getVersion();
	});
	ipcMain.on("getUserDataPath", (event) => {
		event.returnValue = app.getPath("userData");
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
	ipcMain.on("encryptSafeStorage", async (event, plaintextString: string) => {
		event.returnValue = safeStorage.encryptString(plaintextString).toString("base64");
	});
	ipcMain.on("decryptSafeStorage", async (event, encryptedBase64: string) => {
		try {
			event.returnValue = safeStorage.decryptString(Buffer.from(encryptedBase64, "base64"));
		} catch (e) {
			console.error(e);
			event.returnValue = "";
		}
	});
	ipcMain.handle("setBadgeCount", (_event, count) => {
		setBadgeCount(count);
	});
}
