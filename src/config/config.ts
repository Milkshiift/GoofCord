import {app, dialog, ipcRenderer} from "electron";
import path from "path";
import * as fs from "fs";
import {getCustomIcon, tryWithFix} from "../utils";

export let cachedConfig: object = {};

export async function loadConfig() {
    await tryWithFix(async () => {
        const rawData = await fs.promises.readFile(getConfigLocation(), "utf-8");
        cachedConfig = JSON.parse(rawData);
    }, tryFixErrors, "GoofCord was unable to load the config: ");
}

async function tryFixErrors() {
    // This covers: missing settings.json, missing storage folder, corrupted settings.json (parsing error)
    await createStorageFolder();
    await setup();
}

async function createStorageFolder() {
    const userDataPath = app.getPath("userData");
    try {
        await fs.promises.mkdir(path.join(userDataPath, "storage"));
    } catch (e: any) {
        if (e.code !== "EEXIST") {
            console.error("Couldn't create the storage folder:", e);
        }
    }
}

export function getConfig(toGet: string): any {
    if (process.type !== "browser") return ipcRenderer.sendSync("config:getConfig", toGet);

    const result = cachedConfig[toGet];
    if (result !== undefined) {
        return result;
    } else {
        console.log("Missing config parameter:", toGet);
        setConfig(toGet, getDefaults()[toGet]);
        return cachedConfig[toGet];
    }
}

export function setConfig(entry: string, value: unknown) {
    try {
        if (process.type !== "browser") {
            return ipcRenderer.sendSync("config:setConfig", entry, value);
        }
        cachedConfig[entry] = value;
        const toSave = JSON.stringify(cachedConfig);
        fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
    } catch (e: any) {
        console.error("setConfig function errored:", e);
        dialog.showErrorBox("GoofCord was unable to save the settings", e.toString());
    }
}

export function setTemporaryConfig(entry: string, value: unknown) {
    try {
        if (process.type !== "browser") {
            return ipcRenderer.sendSync("config:setTemporaryConfig", entry, value);
        }
        cachedConfig[entry] = value;
    } catch (e: any) {
        console.error("setTemporaryConfig function errored:", e);
    }
}

export function setConfigBulk(object: object) {
    try {
        if (process.type !== "browser") {
            return ipcRenderer.sendSync("config:setConfigBulk", object);
        }
        cachedConfig = object;
        const toSave = JSON.stringify(object);
        fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
    } catch (e: any) {
        console.error("setConfigBulk function errored:", e);
        dialog.showErrorBox("GoofCord was unable to save the settings", e.toString());
    }
}

export async function setup() {
    console.log("Setting up default GoofCord settings.");
    setConfigBulk(getDefaults());
    setTimeout(() => {
        dialog.showMessageBox({
            message: "Welcome to GoofCord!\nIt seems that this is the first launch of GoofCord. It is advisable to fully restart GoofCord so it can fully set itself up.\nYou can do this with Ctrl+Shift+R or through the tray menu.\nHappy chatting!",
            type: "info",
            icon: getCustomIcon(),
            noLink: false
        });
    }, 3000);
}

export function getDefaults() {
    const defaults = {};
    const settingsPath = path.join(__dirname, "/assets/settings.json");
    const settingsFile = fs.readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(settingsFile);
    for (const category in settings) {
        const categorySettings = settings[category];
        for (const setting in categorySettings) {
            defaults[setting] = categorySettings[setting].defaultValue;
        }
    }
    return defaults;
}

export function getConfigLocation(): string {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return `${storagePath}settings.json`;
}