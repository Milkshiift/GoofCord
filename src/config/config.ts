import {app, ipcRenderer} from "electron";
import path from "path";
import * as fs from "fs-extra";
import {jsonStringify} from "../utils";
import {checkConfig} from "./configChecker";

export interface Settings {
    minimizeToTray: boolean;
    dynamicIcon: boolean;
    startMinimized: boolean;
    spellcheck: boolean;
    updateNotification: boolean;
    multiInstance: boolean;
    launchWithOsBoot: boolean;
    arrpc: boolean;
    scriptLoading: boolean;
    autoUpdateDefaultScripts: boolean;
    disableAutogain: boolean;
    autoscroll: boolean;
    framelessWindow: boolean;
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
    multiInstance: false,
    launchWithOsBoot: false,
    arrpc: false,
    scriptLoading: true,
    autoUpdateDefaultScripts: true,
    disableAutogain: false,
    autoscroll: false,
    framelessWindow: true,
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

export async function setup() {
    console.log("Setting up temporary GoofCord settings.");
    await setConfigBulk({
        ...DEFAULTS
    });
}

export function getConfigLocation(): string {
    let userDataPath;
    if (process.type === "renderer") {
        userDataPath = ipcRenderer.sendSync("getUserDataPath");
    }
    else {
        userDataPath = app.getPath("userData");
    }
    const storagePath = path.join(userDataPath, "/storage/");
    return `${storagePath}settings.json`;
}

export async function getConfig(object: string) {
    try {
        const rawData = await fs.promises.readFile(getConfigLocation(), "utf-8");
        const returnData = JSON.parse(rawData);
        return returnData[object];
    } catch (e) {
        await checkConfig();
        return await getConfig(object);
    }
}

export function getConfigSync(object: string) {
    try {
        const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
        const returnData = JSON.parse(rawData);
        return returnData[object];
    } catch (e) {
        checkConfig().then(() => {
            return getConfigSync(object);
        });
    }
}

export async function setConfig(object: string, toSet: unknown) {
    const rawData = await fs.promises.readFile(getConfigLocation(), "utf-8");
    const parsed = JSON.parse(rawData);
    parsed[object] = toSet;
    const toSave = jsonStringify(parsed);
    await fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
}

export async function setConfigBulk(object: Settings) {
    const toSave = jsonStringify(object);
    await fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
}