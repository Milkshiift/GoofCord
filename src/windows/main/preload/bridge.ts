import { contextBridge } from "electron";
import type { ConfigKey, ConfigValue } from "../../../configTypes";
import { invoke, sendSync } from "../../../ipc/client.ts";
import { flashTitlebar, flashTitlebarWithText } from "./titlebarFlash.ts";

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
	version: sendSync("utils:getVersion"),
	displayVersion: sendSync("utils:getDisplayVersion"),
	getConfig: (toGet: ConfigKey, bypassDefault = false) => sendSync("config:getConfig", toGet, bypassDefault),
	setConfig: (key: ConfigKey, value: ConfigValue<ConfigKey>) => invoke("config:setConfig", key, value),
	encryptMessage: (message: string) => sendSync("messageEncryption:encryptMessage", message),
	decryptMessage: (message: string) => sendSync("messageEncryption:decryptMessage", message),
	cycleThroughPasswords: () => invoke("messageEncryption:cycleThroughPasswords"),
	openSettingsWindow: () => invoke("settings:createSettingsWindow"),
	setBadgeCount: (count: number) => invoke("dynamicIcon:setBadgeCount", count),
	stopVenmic: () => invoke("venmic:stopVenmic"),
};

contextBridge.exposeInMainWorld("goofcord", api);
export type GoofCordApi = typeof api;
