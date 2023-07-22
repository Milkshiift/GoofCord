import * as fs from "fs";
import {app, dialog} from "electron";
import path from "path";
import {fetch, Response} from "cross-fetch";
import extract from "extract-zip";
import util from "util";

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

export async function fetchBlackList() {
    const whitelistUrl = "https://raw.githubusercontent.com/Milkshiift/GoofCord/main/whitelist.txt";
    const response = await fetchWithTimeout(whitelistUrl);
    const whitelist = await response.text();
    return whitelist.split("\n").filter(Boolean); // Split the string into an array of URLs and filter out empty lines
}

export async function checkIfBlacklistIsNotEmpty() {
    const whitelist = await getConfig("whitelist");
    if ((await getConfig("autoWhitelist")) == false) {
        if (whitelist === undefined) {
            let fetchedWhitelist = await fetchBlackList();
            await setConfig("whitelist", fetchedWhitelist);
        }
        return;
    } else {
        let fetchedWhitelist = await fetchBlackList();
        await setConfig("whitelist", fetchedWhitelist);
    }
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

export interface Settings {
    minimizeToTray: boolean;
    dynamicIcon: boolean;
    startMinimized: boolean;
    spellcheck: boolean;
    discordUrl: string;
    modName: string;
    prfmMode: string;

    [key: string]: any;
}

const defaults: Settings = {
    minimizeToTray: true,
    startMinimized: false,
    dynamicIcon: false,
    spellcheck: true,
    discordUrl: "https://canary.discord.com/app",
    modName: "vencord",
    prfmMode: "none"
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

export function getConfigLocation() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return storagePath + "settings.json";
}

export async function getConfig(object: string) {
    let rawdata = fs.readFileSync(getConfigLocation(), "utf-8");
    let returndata = JSON.parse(rawdata);
    //console.log("[Config manager] " + object + ": " + returndata[object]);
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
            let name: string = await getConfig("modName");
            const clientMods = {
                none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
                vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
                shelter: "https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js"
            };
            const clientModsCss = {
                none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
                vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
                shelter: "https://armcord.xyz/placeholder.css"
            };
            const timeout = 10000;
            const bundle: string = await (
                await fetchWithTimeout(clientMods[name as keyof typeof clientMods], {method: "GET"}, timeout)
            ).text();
            fs.writeFileSync(distFolder + "bundle.js", bundle, "utf-8");
            const css: string = await (
                await fetchWithTimeout(clientModsCss[name as keyof typeof clientModsCss], {method: "GET"}, timeout)
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
    const response = await fetch(url, {signal: controller.signal, ...options});
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
