import {app, ipcRenderer} from "electron";
import path from "path";
import * as fs from "fs";
import {jsonStringify} from "../utils";
import {checkConfig} from "./configChecker";

export let cachedConfig: object;

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
        if (process.type !== "browser") return ipcRenderer.sendSync("config:getConfig", toGet);

        const result = cachedConfig[toGet];
        if (result !== undefined) return result;

        console.log("Missing config parameter:", toGet);
        setConfig(toGet, getDefaults()[toGet]);
        return cachedConfig[toGet];
    } catch (e) {
        console.log("getConfig function errored:", e);
        return undefined;
    }
}

export function setConfig(entry: string, value: unknown) {
    if (process.type !== "browser") {
        return ipcRenderer.sendSync("config:setConfig", entry, value);
    }
    cachedConfig[entry] = value;
    const toSave = jsonStringify(cachedConfig);
    fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
}

export function setConfigBulk(object: object) {
    if (process.type !== "browser") {
        return ipcRenderer.sendSync("config:setConfigBulk", object);
    }
    cachedConfig = object;
    const toSave = jsonStringify(object);
    fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
}

export async function setup() {
    console.log("Setting up default GoofCord settings.");
    setConfigBulk(getDefaults());
}

export function getDefaults() {
    const defaults = {};
    const settings = require(path.join(__dirname, "../", "/assets/settings.json"));
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