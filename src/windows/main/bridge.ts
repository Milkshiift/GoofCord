import { contextBridge, ipcRenderer } from "electron";
import type { ConfigKey } from "../../configTypes";
import { flashTitlebar, flashTitlebarWithText } from "./titlebar.ts";

contextBridge.exposeInMainWorld("goofcord", {
	window: {
		show: () => ipcRenderer.invoke("window:Show"),
		hide: () => ipcRenderer.invoke("window:Hide"),
		minimize: () => ipcRenderer.invoke("window:Minimize"),
		maximize: () => ipcRenderer.invoke("window:Maximize"),
	},
	titlebar: {
		flashTitlebar: (color: string) => flashTitlebar(color),
		flashTitlebarWithText: (color: string, text: string) => flashTitlebarWithText(color, text),
	},
	electron: process.versions.electron,
	version: ipcRenderer.sendSync("utils:getVersion"),
	displayVersion: ipcRenderer.sendSync("utils:getDisplayVersion"),
	loadConfig: () => ipcRenderer.invoke("config:loadConfig"),
	getConfig: (toGet: string, bypassDefault = false) => ipcRenderer.sendSync("config:getConfig", toGet, bypassDefault),
	setConfig: (key: string, value: ConfigKey) => ipcRenderer.invoke("config:setConfig", key, value),
	encryptMessage: (message: string) => ipcRenderer.sendSync("messageEncryption:encryptMessage", message),
	decryptMessage: (message: string) => ipcRenderer.sendSync("messageEncryption:decryptMessage", message),
	cycleThroughPasswords: () => ipcRenderer.invoke("messageEncryption:cycleThroughPasswords"),
	openSettingsWindow: () => ipcRenderer.invoke("main:createSettingsWindow"),
	setBadgeCount: (count: number) => ipcRenderer.invoke("dynamicIcon:setBadgeCount", count),
	stopVenmic: () => ipcRenderer.invoke("venmic:stopVenmic"),
});
