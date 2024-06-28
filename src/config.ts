import {app, dialog, ipcRenderer} from "electron";
import path from "path";
import * as fs from "fs";
import {getCustomIcon, tryWithFix} from "./utils";

export let cachedConfig: object = {};

export async function loadConfig() {
    await tryWithFix(async () => {
        // I don't know why but specifically in this scenario using fs.promises.readFile is whopping 180 ms compared to ~1 ms using fs.readFileSync
        // Related? https://github.com/nodejs/performance/issues/151
        const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
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
        void setConfig(toGet, getDefaultValue(toGet));
        return cachedConfig[toGet];
    }
}

export async function setConfig(entry: string, value: unknown) {
    try {
        if (process.type !== "browser") {
            await ipcRenderer.invoke("config:setConfig", entry, value);
        }
        cachedConfig[entry] = value;
        const toSave = JSON.stringify(cachedConfig);
        void fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
    } catch (e: any) {
        console.error("setConfig function errored:", e);
        dialog.showErrorBox("GoofCord was unable to save the settings", e.toString());
    }
}

export async function setConfigBulk(object: object) {
    try {
        if (process.type !== "browser") {
            return await ipcRenderer.invoke("config:setConfigBulk", object);
        }
        cachedConfig = object;
        const toSave = JSON.stringify(object);
        await fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
    } catch (e: any) {
        console.error("setConfigBulk function errored:", e);
        dialog.showErrorBox("GoofCord was unable to save the settings", e.toString());
    }
}

export async function setup() {
    console.log("Setting up default GoofCord settings.");
    await setConfigBulk(getDefaults());
    setTimeout(() => {
        dialog.showMessageBox({
            message: "Welcome to GoofCord!\nIt seems that this is the first launch of GoofCord. It is advisable to fully restart GoofCord so it can fully set itself up.\nYou can do this with Ctrl+Shift+R or through the tray menu.\nHappy chatting!",
            type: "info",
            icon: getCustomIcon(),
            noLink: false
        });
    }, 3000);
}

const defaults = {};
export function getDefaults() {
    // Caching
    if (Object.keys(defaults).length !== 0) {
        return defaults;
    }
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

export function getDefaultValue(entry: string) {
    return getDefaults()[entry]
}

export function getConfigLocation(): string {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return `${storagePath}settings.json`;
}
