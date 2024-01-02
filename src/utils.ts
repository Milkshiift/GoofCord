import * as fs from "fs-extra";
import {app, dialog, ipcRenderer} from "electron";
import path from "path";
import {fetch} from "cross-fetch";
import util from "util";

//Get the version value from the "package.json" file
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const packageVersion = require("../package.json").version;

// For some reason, using "import" results in error "TS2769: No overload matches this call"
// I couldn't find a fix, so we are suppressing the eslint error
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const streamPipeline = util.promisify(require("stream").pipeline);

//utility functions that are used all over the codebase or just too obscure to be put in the file used in
export function addStyle(styleString: string) {
    const style = document.createElement("style");
    style.textContent = styleString;
    document.head.append(style);
}

export function addScript(scriptString: string) {
    const script = document.createElement("script");
    script.textContent = scriptString;
    document.body.append(script);
}

export function getVersion() {
    return packageVersion;
}

export function getDisplayVersion() {
    if (!(app.getVersion() == packageVersion)) {
        if (app.getVersion() == process.versions.electron) {
            return `Dev Build (${packageVersion})`;
        } else {
            return `${packageVersion} [Modified]`;
        }
    } else {
        return packageVersion;
    }
}

export async function getCustomIcon() {
    const customIconPath = await getConfig("customIconPath");
    if (customIconPath === "" || customIconPath === undefined) {
        return path.join(__dirname, "../", "/assets/gf_icon.png");
    } else {
        return customIconPath;
    }
}

export function jsonStringify(data: unknown): string {
    const NUMBER_OF_SPACES = 4;
    return JSON.stringify(data, null, NUMBER_OF_SPACES);
}

//GoofCord Window State manager
export interface WindowState {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
}

function getWindowSettingsFile() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return storagePath + "window.json";
}

export async function setWindowState(object: WindowState) {
    const toSave = jsonStringify(object);
    fs.promises.writeFile(getWindowSettingsFile(), toSave, "utf-8");
}

export async function getWindowState(object: string) {
    try {
        const rawData = await fs.promises.readFile(getWindowSettingsFile(), "utf-8");
        const returnData = JSON.parse(rawData);
        return returnData[object];
    } catch (e) {
        return null;
    }
}

//GoofCord Settings/Storage manager

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

const DEFAULTS: Settings = {
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

export async function checkConfigForMissingParams() {
    const REQUIRED_PARAMETERS: string[] = Object.keys(DEFAULTS);
    for (const PARAMETER of REQUIRED_PARAMETERS) {
        if ((await getConfig(PARAMETER)) == undefined) {
            console.error(`Missing parameter: ${PARAMETER}`);
            await setConfig(PARAMETER, DEFAULTS[PARAMETER]);
        }
    }
}

export function getConfigLocation(): string {
    let userDataPath;
    if (process.type === "renderer") {
        userDataPath = ipcRenderer.sendSync("getUserData");
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
        const returnData: any = await getConfig(object);
        return returnData;
    }
}

export function getConfigSync(object: string) {
    try {
        const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
        const returnData = JSON.parse(rawData);
        return returnData[object];
    } catch (e) {
        checkConfig().then(() => {
            const returnData: any = getConfigSync(object);
            return returnData;
        });
    }
}

export async function checkConfig() {
    await checkIfFoldersExist();
    await checkIfConfigExists();
    await checkIfConfigIsBroken();
    await checkConfigForMissingParams();
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

export async function checkIfConfigExists() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const settingsFile = storagePath + "settings.json";

    if (!fs.existsSync(settingsFile)) {
        console.log("First run of GoofCord. Starting setup.");
        await setup();
    }
}

export async function checkIfConfigIsBroken(): Promise<void> {
    try {
        const rawData = await fs.promises.readFile(getConfigLocation(), "utf-8");
        JSON.parse(rawData);
    } catch (e) {
        console.error(e);
        console.log("Detected a corrupted config");
        await setup();
        dialog.showErrorBox(
            "Oops, something went wrong.",
            "GoofCord has detected that your configuration file is corrupted, please restart the app and set your settings again. If this issue persists, report it on the support server/Github issues."
        );
    }
}

export async function checkIfFoldersExist() {
    const userDataPath = app.getPath("userData");
    const foldersToCheck = ["storage", "scripts", "styles"];

    for (const folderName of foldersToCheck) {
        const folderPath = path.join(userDataPath, folderName);
        const exists = await fs.pathExists(folderPath);

        if (!exists) {
            await fs.promises.mkdir(folderPath);
            console.log(`Created missing ${folderName} folder`);
        }
    }
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout reached while fetching from "+url+". Check your internet connection")), timeout);
    });
    return await Promise.race([fetch(url, {signal: controller.signal, ...options}), timeoutPromise]);
}