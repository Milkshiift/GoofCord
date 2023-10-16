import * as fs from "graceful-fs";
import {app, dialog} from "electron";
import path from "path";
import {fetch} from "cross-fetch";
import extract from "extract-zip";
import util from "util";
import {patchVencord} from "./modules/vencordPatcher";

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
    await fs.promises.writeFile(getWindowSettingsFile(), toSave, "utf-8");
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
    discordUrl: string;
    modName: string;
    prfmMode: string;
    blocklist: string[];
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
    modName: "vencord",
    prfmMode: "none",
    discordUrl: "https://canary.discord.com/app",
    customJsBundle: "https://armcord.xyz/placeholder.js",
    customCssBundle: "https://armcord.xyz/placeholder.css",
    blocklist: [ // This list works in tandem with the "blockedStrings" list located in window.ts
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
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return `${storagePath}settings.json`;
}

export async function getConfig(object: string) {
    const rawData = await fs.promises.readFile(getConfigLocation(), "utf-8");
    const returnData = JSON.parse(rawData);
    return returnData[object];
}

export function getConfigSync(object: string) {
    const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
    const returnData = JSON.parse(rawData);
    return returnData[object];
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
        console.log("First run of the GoofCord. Starting setup.");
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
    const storagePath = path.join(userDataPath, "/storage/");
    const scriptsPath = path.join(userDataPath, "/scripts/");

    if (!fs.existsSync(storagePath)) {
        await fs.promises.mkdir(storagePath);
        console.log("Created missing storage folder");
    }
    if (!fs.existsSync(scriptsPath)) {
        await fs.promises.mkdir(scriptsPath);
        console.log("Created missing scripts folder");
    }
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {signal: controller.signal, ...options});
    clearTimeout(timeout_id);
    return response;
}

// Mods
const MOD_BUNDLE_URLS = {
    none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
    vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
    shelter: "https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js",
    custom: "", // Initialize with an empty string and populate it later
};

const MOD_BUNDLE_CSS_URLS = {
    none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
    vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
    shelter: "https://armcord.xyz/placeholder.css",
    custom: "", // Initialize with an empty string and populate it later
};

const TIMEOUT = 10000;

async function downloadAndWriteBundle(url: string, filePath: string) {
    try {
        const response = await fetchWithTimeout(url, {method: "GET"}, TIMEOUT);
        if (!response.ok) {
            throw new Error(`Unexpected response: ${response.statusText}`);
        }
        let bundle = await response.text();

        const modName: keyof typeof MOD_BUNDLE_URLS = await getConfig("modName");
        if (modName === "vencord" && !url.endsWith(".css")) {
            bundle = await patchVencord(bundle);
        }

        await fs.promises.writeFile(filePath, bundle, "utf-8");
    } catch (error) {
        console.error(error);
        throw new Error("Failed to download and write bundle");
    }
}

async function updateModBundle() {
    if (await getConfig("noBundleUpdates")) {
        console.log("[Mod loader] Skipping mod bundle update");
        return;
    }

    try {
        console.log("[Mod loader] Downloading mod bundle");
        const distFolder = path.join(app.getPath("userData"), "extensions/loader/dist/");
        await fs.promises.mkdir(distFolder, {recursive: true});

        const modName: keyof typeof MOD_BUNDLE_URLS = await getConfig("modName");
        if (modName === "custom") {
            MOD_BUNDLE_URLS.custom = await getConfig("customJsBundle");
            MOD_BUNDLE_CSS_URLS.custom = await getConfig("customCssBundle");
        }

        await downloadAndWriteBundle(MOD_BUNDLE_URLS[modName], path.join(distFolder, "bundle.js"));
        await downloadAndWriteBundle(MOD_BUNDLE_CSS_URLS[modName], path.join(distFolder, "bundle.css"));

        console.log("[Mod loader] Mod bundle updated");
    } catch (error) {
        console.error("[Mod loader] Failed to install mods");
        console.error(error);
        dialog.showErrorBox(
            "Oops, something went wrong.",
            "GoofCord couldn't install mods, please check if you have a stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
        );
    }
}

export async function installModLoader() {
    const extensionFolder = path.join(app.getPath("userData"), "extensions/");
    const loaderFolder = path.join(extensionFolder, "loader");
    const distFolder = path.join(loaderFolder, "dist");
    const bundleCssPath = path.join(distFolder, "bundle.css");

    if (!fs.existsSync(loaderFolder) || !fs.existsSync(bundleCssPath)) {
        try {
            // Remove the existing loader folder recursively
            await fs.promises.rm(loaderFolder, {recursive: true, force: true});

            if (!fs.existsSync(extensionFolder)) {
                await fs.promises.mkdir(extensionFolder);
                console.log("[Mod loader] Created missing extension folder");
            }

            const zipPath = path.join(app.getPath("temp"), "loader.zip");
            const loaderZip = await fetchWithTimeout("https://armcord.xyz/loader.zip");

            if (!loaderZip.ok) throw new Error(`Unexpected response: ${loaderZip.statusText}`);

            await streamPipeline(loaderZip.body, fs.createWriteStream(zipPath));
            await extract(zipPath, {dir: path.join(app.getPath("userData"), "extensions")});
            await updateModBundle();
            import("./modules/extensions");
        } catch (error) {
            console.error("[Mod loader] Failed to install modloader");
            console.error(error);
            dialog.showErrorBox(
                "Oops, something went wrong.",
                "GoofCord couldn't install the internal mod loader, please check if you have a stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
            );
        }
    } else {
        await updateModBundle();
        import("./modules/extensions");
    }
}