import {app, dialog} from "electron";
import path from "path";
import {getConfig} from "./config/config";
import extract from "extract-zip";
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

export async function extractZipFromUrl(url: string, path: string, excludedFiles: string[] = []) {
    try {
        await fs.promises.mkdir(path, { recursive: true });
    } catch (e) {}
    const zip = await fetchWithTimeout(url);
    const zipBuffer = Buffer.from(await zip.arrayBuffer());
    await extract.extractBuffer(zipBuffer, { dir: path, excludedFiles: excludedFiles });
}

export function isSemverLower(version1: string, version2: string): boolean {
    const v1Parts = version1.split(".");
    const v2Parts = version2.split(".");

    for (let i = 0; i < v1Parts.length; i++) {
        const v1Part = parseInt(v1Parts[i]);
        const v2Part = parseInt(v2Parts[i]);

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
            dialog.showErrorBox(message, error.toString());
        }
    }
}

export async function tryReturnWithFix(toDo: () => any, attemptFix: () => any, message: string) {
    try {
        return await toDo();
    } catch (error) {
        console.error(message, error);
        await attemptFix();
        try {
            return await toDo();
        } catch (error: any) {
            console.error(message, error);
            dialog.showErrorBox(message, error.toString());
            return undefined;
        }
    }
}

export function tryReturnWithFixSync(toDo: () => any, attemptFix: () => any, message: string) {
    try {
        return toDo();
    } catch (error) {
        console.error(message, error);
        attemptFix();
        try {
            return toDo();
        } catch (error: any) {
            console.error(message, error);
            dialog.showErrorBox(message, error.toString());
            return undefined;
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