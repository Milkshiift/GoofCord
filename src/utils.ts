import {app} from "electron";
import path from "path";
import {getConfig} from "./config";
import fs from "fs";

//Get the version value from the "package.json" file
export const packageVersion = require("../package.json").version;

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

export function isDev() {
    return process.argv.some(arg => arg === "--dev" || arg === "-d");
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

export function getCustomIcon() {
    const customIconPath = getConfig("customIconPath");
    if (typeof customIconPath === "string" && customIconPath !== "") {
        return customIconPath;
    } else if (process.platform == "win32") {
        return path.join(__dirname, "/assets/gf_icon.ico");
    } else {
        return path.join(__dirname, "/assets/gf_icon.png");
    }
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout reached while fetching from "+url+". Check your internet connection")), timeout);
    });
    return await Promise.race([fetch(url, {signal: controller.signal, ...options}), timeoutPromise]);
}

export function isSemverLower(version1: string, version2: string): boolean {
    const v1Parts = version1.split(".").map(Number);
    const v2Parts = version2.split(".").map(Number);

    for (let i = 0; i < v1Parts.length; i++) {
        const v1Part = v1Parts[i];
        const v2Part = v2Parts[i];

        if (v1Part < v2Part) {
            return true;
        } else if (v1Part > v2Part) {
            return false;
        }
    }

    return false;
}

export async function tryWithFix(toDo: () => any, attemptFix: () => any, message: string) {
    try {
        await toDo();
    } catch (error) {
        console.error(message, error);
        await attemptFix();
        try {
            await toDo();
        } catch (error: any) {
            console.error(message, error);
        }
    }
}

export async function readOrCreateFolder(path: string) {
    try {
        return await fs.promises.readdir(path);
    } catch (e) {
        await fs.promises.mkdir(path, { recursive: true });
        return [];
    }
}
