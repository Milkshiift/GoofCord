import * as fs from "fs";
import {app, dialog} from "electron";
import path from "path";
import {fetch, Response} from "cross-fetch";
import extract from "extract-zip";
import util from "util";
import {mainWindow} from "./window";

const streamPipeline = util.promisify(require("stream").pipeline);
export var firstRun: boolean;
export var contentPath: string;

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

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkIfConfigIsBroken() {
    if ((await getConfig("0")) == "d") {
        console.log("Detected a corrupted config");
        setup();
        dialog.showErrorBox(
            "Oops, something went wrong.",
            "GoofCord has detected that your configuration file is corrupted, please restart the app and set your settings again. If this issue persists, report it on the support server/Github issues."
        );
    }
}

export function setup() {
    console.log("Setting up temporary GoofCord settings.");
    const defaults: Settings = {
        minimizeToTray: true,
        inviteWebsocket: true,
        startMinimized: false,
        dynamicIcon: false,
        whitelist: [
            'wss:',
            'file:',                                              // Allow local files
            'devtools:',                                          // Allow devtools
            'PATCH',                                              // Mute/Unmute/notification/cosmetic guild changes
            'DELETE',                                             // Leaving a guild / Deleting messages
            'https://canary.discord.com/app',
            'https://canary.discord.com/assets',
            'https://canary.discord.com/login',
            'https://cdn.discordapp.com/',
            'https://canary.discord.com/api/v9/channels/',        // Text channel address
            'https://canary.discord.com/api/v9/auth/',             // Login address
            'https://canary.discord.com/api/v9/invites/',         // Accepting guild invite
            'https://canary.discord.com/api/v9/voice/regions',    // Required when creating new guild
            'https://canary.discord.com/api/v9/guilds',           // Creating a guild
            'https://canary.discord.com/api/v9/gateway',          // This may be required to get past login screen if not cached locally
            'https://canary.discord.com/api/v9/interactions',     // Slash Commands
            "https://canary.discord.com/api/v9/activities/",      // Discord activities so you can have fun with your friends
            'https://canary.discord.com/api/v9/users/',
            'https://images-ext',
            'https://media.discordapp.net/',
            'https://discord-attachments',
            'https://raw.githubusercontent.com/'           // Required for themes to work
        ]
    };
    setConfigBulk({
        ...defaults
    });
}

export function checkConfig(): boolean {
    const requiredParams: string[] = ['minimizeToTray', 'inviteWebsocket', 'startMinimized', 'dynamicIcon', 'whitelist'];
    for (const param of requiredParams) {
        if (getConfig(param) == undefined) {
            console.error(`Missing parameter: ${param}`);
            setup();
            return false;
        }
    }
    return true;
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

export async function getLang(object: string) {
    let langPath = path.join(__dirname, "../", "/assets/lang/en-US.json");
    let rawdata = fs.readFileSync(langPath, "utf-8");
    let parsed = JSON.parse(rawdata);
    return parsed[object];
}

//GoofCord Window State manager
export interface WindowState {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
}

export async function setWindowState(object: WindowState) {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const saveFile = storagePath + "window.json";
    let toSave = JSON.stringify(object, null, 4);
    fs.writeFileSync(saveFile, toSave, "utf-8");
}

export async function getWindowState(object: string) {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const settingsFile = storagePath + "window.json";
    let rawdata = fs.readFileSync(settingsFile, "utf-8");
    let returndata = JSON.parse(rawdata);
    console.log(returndata);
    console.log("[Window state manager] " + returndata);
    return returndata[object];
}

//GoofCord Settings/Storage manager
export function checkForDataFolder() {
    const dataPath = path.join(path.dirname(app.getPath("exe")), "armcord-data");
    if (fs.existsSync(dataPath) && fs.statSync(dataPath).isDirectory()) {
        console.log("Found armcord-data folder. Running in portable mode.");
        app.setPath("userData", dataPath);
    }
}

export interface Settings {
    minimizeToTray: boolean;
    dynamicIcon: boolean;
    startMinimized: boolean;
    inviteWebsocket: boolean;
    whitelist: string[];
}

export function getConfigLocation() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return storagePath + "settings.json";
}

export async function getConfig(object: string) {
    let rawdata = fs.readFileSync(getConfigLocation(), "utf-8");
    let returndata = JSON.parse(rawdata);
    console.log("[Config manager] " + object + ": " + returndata[object]);
    return returndata[object];
}

export async function setConfig(object: string, toSet: any) {
    let rawdata = fs.readFileSync(getConfigLocation(), "utf-8");
    let parsed = JSON.parse(rawdata);
    parsed[object] = toSet;
    let toSave = JSON.stringify(parsed, null, 4);
    fs.writeFileSync(getConfigLocation(), toSave, "utf-8");
}

export async function setConfigBulk(object: Settings) {
    let toSave = JSON.stringify(object, null, 4);
    fs.writeFileSync(getConfigLocation(), toSave, "utf-8");
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
        firstRun = true;
    }
}

// Mods
async function updateModBundle() {
    if ((await getConfig("noBundleUpdates")) == undefined ?? false) {
        try {
            console.log("Downloading mod bundle");
            const distFolder = app.getPath("userData") + "/plugins/loader/dist/";
            while (!fs.existsSync(distFolder)) {
                //waiting
            }
            const timeout = 10000;
            const bundle: string = await (
                await fetchWithTimeout("https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js", { method: "GET" }, timeout)
            ).text();
            fs.writeFileSync(distFolder + "bundle.js", bundle, "utf-8");
            const css: string = await (
                await fetchWithTimeout("https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css", { method: "GET" }, timeout)
            ).text();
            fs.writeFileSync(distFolder + "bundle.css", css, "utf-8");
        } catch (e) {
            console.log("[Mod loader] Failed to install mods");
            console.error(e);
            dialog.showErrorBox(
                "Oops, something went wrong.",
                "GoofCord couldn't install mods, please check if you have stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
            );
        }
    } else {
        console.log("[Mod loader] Skipping mod bundle update");
    }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { signal: controller.signal, ...options });
    clearTimeout(timeoutId);
    return response;
}

export async function installModLoader() {
    const pluginFolder = app.getPath("userData") + "/plugins/";
    if (!fs.existsSync(pluginFolder + "loader") || !fs.existsSync(pluginFolder + "loader/dist/" + "bundle.css")) {
        try {
            fs.rmSync(app.getPath("userData") + "/plugins/loader", {recursive: true, force: true});
            const zipPath = app.getPath("temp") + "/" + "loader.zip";
            if (!fs.existsSync(pluginFolder)) {
                fs.mkdirSync(pluginFolder);
                console.log("[Mod loader] Created missing plugin folder");
            }
            const loaderZip = await fetch("https://armcord.xyz/loader.zip");
            if (!loaderZip.ok) throw new Error(`unexpected response ${loaderZip.statusText}`);
            await streamPipeline(loaderZip.body, fs.createWriteStream(zipPath));
            await extract(zipPath, {dir: path.join(app.getPath("userData"), "plugins")});
            await updateModBundle();
            import("./extensions/plugin");
        } catch (e) {
            console.log("[Mod loader] Failed to install modloader");
            console.error(e);
            dialog.showErrorBox(
                "Oops, something went wrong.",
                "GoofCord couldn't install internal mod loader, please check if you have stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
            );
        }
    } else {
        await updateModBundle();
        import("./extensions/plugin");
    }
}
