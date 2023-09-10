import * as fs from "fs";
import {app, dialog} from "electron";
import path from "path";
import {fetch} from "cross-fetch";
import extract from "extract-zip";
import util, {promisify} from "util";

const streamPipeline = util.promisify(require("stream").pipeline);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

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

//Get the version value from the "package.json" file
export var packageVersion = require("../package.json").version;

export function getVersion() {
    return packageVersion;
}

export function getDisplayVersion() {
    //Checks if the app version # has 4 sections (3.1.0.0) instead of 3 (3.1.0) / Shitty way to check if Kernel Mod is installed
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

//GoofCord Window State manager
export interface WindowState {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
}

function getSettingsFile() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return storagePath + "window.json";
}

export async function setWindowState(object: WindowState) {
    let toSave = JSON.stringify(object, null, 4);
    await writeFile(getSettingsFile(), toSave, "utf-8");
}

export async function getWindowState(object: string) {
    try {
        let rawdata = await readFile(getSettingsFile(), "utf-8");
        let returndata = JSON.parse(rawdata);
        return returndata[object];
    }
    catch (e) {
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
    discordUrl: string;
    modName: string;
    prfmMode: string;
    customJsBundle: RequestInfo | URL;
    customCssBundle: RequestInfo | URL;
    blocklist: string[];

    [key: string]: unknown;
}

const defaults: Settings = {
    minimizeToTray: true,
    startMinimized: false,
    dynamicIcon: false,
    spellcheck: true,
    updateNotification: true,
    multiInstance: false,
    launchWithOsBoot: false,
    modName: "vencord",
    prfmMode: "none",
    discordUrl: "https://canary.discord.com/app",
    customJsBundle: "https://armcord.xyz/placeholder.js",
    customCssBundle: "https://armcord.xyz/placeholder.css",
    blocklist: [ // This list works in tandem with "blockedStrings" list located in window.ts
        // Discord. Blocking tracking and some URLs that just eat bandwidth.
        "https://*/api/v*/science", // General telemetry
        "https://*.nel.cloudflare.com/*",
        "https://*/api/v*/applications/detectable",
        "https://*/api/v*/auth/location-metadata",
        "https://cdn.discordapp.com/bad-domains/*",
        // Youtube. Blocking everything that is not needed for playback.
        "https://www.youtube.com/youtubei/v*/next?*",
        "https://www.youtube.com/s/desktop/*"
    ],
};

export function setup() {
    console.log("Setting up temporary GoofCord settings.");
    setConfigBulk({
        ...defaults
    });
}

export async function checkConfig() {
    const requiredParams: string[] = Object.keys(defaults);
    for (const param of requiredParams) {
        if ((await getConfig(param)) == undefined) {
            console.error(`Missing parameter: ${param}`);
            await setConfig(param, defaults[param]);
        }
    }
}

export function getConfigLocation(): string {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return `${storagePath}settings.json`;
}

export async function getConfig(object: string) {
    try {
        const rawdata = await readFile(getConfigLocation(), 'utf-8');
        const returndata = JSON.parse(rawdata);
        return returndata[object];
    } catch (error) {
        throw error;
    }
}

export function getConfigSync(object: string) {
    let rawdata = fs.readFileSync(getConfigLocation(), "utf-8");
    let returndata = JSON.parse(rawdata);
    return returndata[object];
}

export async function setConfig(object: string, toSet: any) {
    try {
        const rawdata = await readFile(getConfigLocation(), 'utf-8');
        const parsed = JSON.parse(rawdata);
        parsed[object] = toSet;
        const toSave = JSON.stringify(parsed, null, 4);
        await writeFile(getConfigLocation(), toSave, 'utf-8');
    } catch (error) {
        throw error;
    }
}

export async function setConfigBulk(object: Settings) {
    try {
        const toSave = JSON.stringify(object, null, 4);
        await writeFile(getConfigLocation(), toSave, 'utf-8');
    } catch (error) {
        throw error;
    }
}

export async function checkIfConfigExists() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const settingsFile = storagePath + "settings.json";

    if (!fs.existsSync(settingsFile)) {
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath);
            console.log("Created missing storage folder");
        }
        console.log("First run of the GoofCord. Starting setup.");
        setup();
    }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {signal: controller.signal, ...options});
    clearTimeout(timeoutId);
    return response;
}

// Mods
const MOD_BUNDLE_URLS = {
    none: 'https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js',
    vencord: 'https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js',
    shelter: 'https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js',
    custom: '', // Initialize with an empty string and populate it later
};

const MOD_BUNDLE_CSS_URLS = {
    none: 'https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css',
    vencord: 'https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css',
    shelter: 'https://armcord.xyz/placeholder.css',
    custom: '', // Initialize with an empty string and populate it later
};

const TIMEOUT = 10000;

async function downloadAndWriteBundle(url: string, filePath: string) {
    try {
        const response = await fetchWithTimeout(url, { method: 'GET' }, TIMEOUT);
        if (!response.ok) {
            throw new Error(`Unexpected response: ${response.statusText}`);
        }
        const bundle = await response.text();
        await writeFile(filePath, bundle, 'utf-8');
    } catch (error) {
        console.error(error);
        throw new Error('Failed to download and write bundle');
    }
}

async function updateModBundle() {
    if (await getConfig('noBundleUpdates')) {
        console.log('[Mod loader] Skipping mod bundle update');
        return;
    }

    try {
        console.log('Downloading mod bundle');
        const distFolder = path.join(app.getPath('userData'), 'plugins/loader/dist/');
        await fs.promises.mkdir(distFolder, { recursive: true });

        // Provide a type annotation for modName
        const modName: keyof typeof MOD_BUNDLE_URLS = await getConfig('modName');

        if (modName === "custom") {
            MOD_BUNDLE_URLS.custom = await getConfig('customJsBundle');
            MOD_BUNDLE_CSS_URLS.custom = await getConfig('customCssBundle');
        }

        await downloadAndWriteBundle(MOD_BUNDLE_URLS[modName], path.join(distFolder, 'bundle.js'));
        await downloadAndWriteBundle(MOD_BUNDLE_CSS_URLS[modName], path.join(distFolder, 'bundle.css'));

        console.log('Mod bundle updated');
    } catch (error) {
        console.error('[Mod loader] Failed to install mods');
        console.error(error);
        dialog.showErrorBox(
            'Oops, something went wrong.',
            'GoofCord couldn\'t install mods, please check if you have a stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues.'
        );
    }
}

export async function installModLoader() {
    const pluginFolder = path.join(app.getPath('userData'), 'plugins/');
    const loaderFolder = path.join(pluginFolder, 'loader');
    const distFolder = path.join(loaderFolder, 'dist');
    const bundleCssPath = path.join(distFolder, 'bundle.css');

    if (!await exists(loaderFolder) || !await exists(bundleCssPath)) {
        try {
            // Remove the existing loader folder recursively
            await fs.promises.rm(loaderFolder, { recursive: true, force: true });

            if (!await exists(pluginFolder)) {
                await fs.promises.mkdir(pluginFolder);
                console.log('[Mod loader] Created missing plugin folder');
            }

            const zipPath = path.join(app.getPath('temp'), 'loader.zip');
            const loaderZip = await fetchWithTimeout('https://armcord.xyz/loader.zip');

            if (!loaderZip.ok) throw new Error(`Unexpected response: ${loaderZip.statusText}`);

            await streamPipeline(loaderZip.body, fs.createWriteStream(zipPath));
            await extract(zipPath, { dir: path.join(app.getPath('userData'), 'plugins') });
            await updateModBundle();
            import('./modules/plugin');
        } catch (error) {
            console.error('[Mod loader] Failed to install modloader');
            console.error(error);
            dialog.showErrorBox(
                'Oops, something went wrong.',
                'GoofCord couldn\'t install the internal mod loader, please check if you have a stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues.'
            );
        }
    } else {
        await updateModBundle();
        import('./modules/plugin');
    }
}