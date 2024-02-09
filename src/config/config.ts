import {app, ipcRenderer} from "electron";
import path from "path";
import * as fs from "fs-extra";
import {jsonStringify} from "../utils";
import {checkConfig, checkConfigForMissingParams} from "./configChecker";

export interface Settings {
    minimizeToTray: boolean;
    dynamicIcon: boolean;
    startMinimized: boolean;
    spellcheck: boolean;
    updateNotification: boolean;
    launchWithOsBoot: boolean;
    arrpc: boolean;
    scriptLoading: boolean;
    autoUpdateDefaultScripts: boolean;
    disableAutogain: boolean;
    autoscroll: boolean;
    framelessWindow: boolean;
    transparency: boolean;
    encryptionCover: string;
    encryptionMark: string;
    discordUrl: string;
    modName: string;
    prfmMode: string;
    customIconPath: string;
    blocklist: string[];
    encryptionPasswords: string[];
    customJsBundle: RequestInfo | URL;
    customCssBundle: RequestInfo | URL;

    [key: string]: unknown;
}

export const DEFAULTS: Settings = {
    minimizeToTray: true,
    startMinimized: false,
    dynamicIcon: false,
    spellcheck: true,
    updateNotification: true,
    launchWithOsBoot: false,
    arrpc: false,
    scriptLoading: true,
    autoUpdateDefaultScripts: true,
    disableAutogain: false,
    autoscroll: false,
    framelessWindow: true,
    transparency: false,
    encryptionCover: "",
    encryptionMark: "| ",
    modName: "vencord",
    prfmMode: "none",
    discordUrl: "https://discord.com/app",
    customJsBundle: "https://armcord.xyz/placeholder.js",
    customCssBundle: "https://armcord.xyz/placeholder.css",
    customIconPath: "",
    blocklist: [ // This list works in tandem with the "blockedStrings" list located in firewall.ts
        // Discord. Blocking tracking and some URLs that just eat bandwidth.
        "https://*/api/v*/science", // General telemetry
        "https://*.nel.cloudflare.com/*",
        "https://*/api/v*/applications/detectable",
        "https://*/api/v*/auth/location-metadata",
        "https://cdn.discordapp.com/bad-domains/*",
        // YouTube. Blocking everything not needed for playback.
        "https://www.youtube.com/youtubei/v*/next?*",
        "https://www.youtube.com/s/desktop/*"
    ],
    encryptionPasswords: []
};

export let cachedConfig: Settings;

export async function loadConfig() {
    try {
        const rawData = await fs.promises.readFile(getConfigLocation(), "utf-8");
        cachedConfig = JSON.parse(rawData);
    } catch (e) {
        console.log("Couldn't load the config:", e);
        await checkConfig();
        loadConfig();
    }
}

export function getConfig(toGet: string): any {
    try {
        if (process.type !== "browser") {
            return ipcRenderer.sendSync("config:getConfig", toGet);
        }
        return cachedConfig[toGet];
    } catch (e) {
        console.log("getConfig function errored:", e);
        return checkConfigForMissingParams().then(() => {return getConfig(toGet);});
    }
}

export async function setConfig(entry: string, value: unknown) {
    if (process.type !== "browser") {
        return ipcRenderer.sendSync("config:setConfig", entry, value);
    }
    cachedConfig[entry] = value;
    const toSave = jsonStringify(cachedConfig);
    await fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
}

export async function setConfigBulk(object: Settings) {
    if (process.type !== "browser") {
        return ipcRenderer.sendSync("config:setConfigBulk", object);
    }
    cachedConfig = object;
    const toSave = jsonStringify(object);
    await fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
}

export async function setup() {
    console.log("Setting up default GoofCord settings.");
    await setConfigBulk({
        ...DEFAULTS
    });
}

export function getConfigLocation(): string {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return `${storagePath}settings.json`;
}