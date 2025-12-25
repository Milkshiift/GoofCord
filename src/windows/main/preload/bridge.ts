import { contextBridge, ipcRenderer } from "electron";
import { invoke, sendSync } from "../../../ipc/client.ts";
import type { ConfigKey, ConfigValue } from "../../../settingsSchema.ts";
import { flashTitlebar, flashTitlebarWithText } from "./titlebarFlash.ts";

export let isVencordPresent = false;
export function setVencordPresent(value: boolean) {
	isVencordPresent = value;
}

const api = {
	window: {
		show: () => invoke("window:Show"),
		hide: () => invoke("window:Hide"),
		minimize: () => invoke("window:Minimize"),
		maximize: () => invoke("window:Maximize"),
		close: () => invoke("window:Close"),
	},
	titlebar: {
		flashTitlebar: (color: string) => flashTitlebar(color),
		flashTitlebarWithText: (color: string, text: string) => flashTitlebarWithText(color, text),
	},
	arrpc: {
		onActivity: (callback: (dataJson: string) => void) => ipcRenderer.on("arrpc:activity", (_event, dataJson: string) => callback(dataJson)),
		onInvite: (callback: (code: string) => void) => ipcRenderer.on("arrpc:invite", (_event, code) => callback(code)),
	},
	version: sendSync("utils:getVersion"),
	displayVersion: sendSync("utils:getDisplayVersion"),
	getVersions: () => process.versions,
	getConfig: (toGet: ConfigKey, bypassDefault = false) => sendSync("config:getConfig", toGet, bypassDefault),
	setConfig: (key: ConfigKey, value: ConfigValue<ConfigKey>) => invoke("config:setConfig", key, value),
	encryptMessage: (message: string) => sendSync("messageEncryption:encryptMessage", message),
	decryptMessage: (message: string) => sendSync("messageEncryption:decryptMessage", message),
	cycleThroughPasswords: () => invoke("messageEncryption:cycleThroughPasswords"),
	openSettingsWindow: () => invoke("settings:createSettingsWindow"),
	setBadgeCount: (count: number) => invoke("dynamicIcon:setBadgeCount", count),
	stopVenmic: () => invoke("venmic:stopVenmic"),
	isVencordPresent: () => isVencordPresent,
	onInvidiousConfigChanged: (callback: () => void) => ipcRenderer.on("invidiousConfigChanged", callback),
	openQuickCssWindow: () => invoke("quickCssFix:createQuickCssWindow"),
};

contextBridge.exposeInMainWorld("goofcord", api);
export type GoofCordApi = typeof api;
