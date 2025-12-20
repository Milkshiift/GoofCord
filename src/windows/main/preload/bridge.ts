import { contextBridge, ipcRenderer } from "electron";
import type { ConfigKey, } from "../../../configTypes";
import { flashTitlebar, flashTitlebarWithText } from "./titlebarFlash.ts";

const api = {
	window: {
		show: () => ipcRenderer.invoke("window:Show"),
		hide: () => ipcRenderer.invoke("window:Hide"),
		minimize: () => ipcRenderer.invoke("window:Minimize"),
		maximize: () => ipcRenderer.invoke("window:Maximize"),
		close: () => ipcRenderer.invoke("window:Close"),
	},
	titlebar: {
		flashTitlebar: (color: string) => flashTitlebar(color),
		flashTitlebarWithText: (color: string, text: string) => flashTitlebarWithText(color, text),
	},
	version: ipcRenderer.sendSync("utils:getVersion"),
	displayVersion: ipcRenderer.sendSync("utils:getDisplayVersion"),
	getConfig: (toGet: ConfigKey, bypassDefault = false) => ipcRenderer.sendSync("config:getConfig", toGet, bypassDefault),
	setConfig: (key: ConfigKey, value: unknown) => ipcRenderer.invoke("config:setConfig", key, value),
	encryptMessage: (message: string) => ipcRenderer.sendSync("messageEncryption:encryptMessage", message),
	decryptMessage: (message: string) => ipcRenderer.sendSync("messageEncryption:decryptMessage", message),
	cycleThroughPasswords: () => ipcRenderer.invoke("messageEncryption:cycleThroughPasswords"),
	openSettingsWindow: () => ipcRenderer.invoke("settings:createSettingsWindow"),
	setBadgeCount: (count: number) => ipcRenderer.invoke("dynamicIcon:setBadgeCount", count),
	stopVenmic: () => ipcRenderer.invoke("venmic:stopVenmic"),
};

contextBridge.exposeInMainWorld("goofcord", api);
export type GoofCordApi = typeof api;