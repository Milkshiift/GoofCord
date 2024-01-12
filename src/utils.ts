import {app} from "electron";
import path from "path";
import {fetch} from "cross-fetch";
import util from "util";
import {getConfig} from "./config/config";

//Get the version value from the "package.json" file
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const packageVersion = require("../package.json").version;

// Using "import" results in error "TS2769: No overload matches this call"
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const streamPipeline = util.promisify(require("stream").pipeline);

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

export async function getCustomIcon() {
    const customIconPath = await getConfig("customIconPath");
    if (customIconPath === "" || customIconPath === undefined) {
        return path.join(__dirname, "../", "/assets/gf_icon.png");
    } else {
        return customIconPath;
    }
}

export function jsonStringify(data: unknown): string {
    const NUMBER_OF_SPACES = 4;
    return JSON.stringify(data, null, NUMBER_OF_SPACES);
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout reached while fetching from "+url+". Check your internet connection")), timeout);
    });
    return await Promise.race([fetch(url, {signal: controller.signal, ...options}), timeoutPromise]);
}