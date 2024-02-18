import {app} from "electron";
import path from "path";
import fs from "fs";
import {jsonStringify} from "../utils";

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