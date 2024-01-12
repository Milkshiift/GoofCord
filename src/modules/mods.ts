import * as fs from "fs-extra";
import {app, dialog} from "electron";
import path from "path";
import {fetchWithTimeout} from "../utils";
import {patchVencord} from "../scriptLoader/vencordPatcher";
import {getConfig} from "../config/config";

const MOD_BUNDLE_URLS = {
    none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
    vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
    shelter: "https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js",
    custom: "", // Initialize with an empty string and populate it later
};

const MOD_BUNDLE_CSS_URLS = {
    none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
    vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
    shelter: "https://armcord.xyz/placeholder.css",
    custom: "", // Initialize with an empty string and populate it later
};

const MOD_DOWNLOAD_TIMEOUT = 10000;

async function downloadAndWriteBundle(url: string, filePath: string) {
    try {
        const response = await fetchWithTimeout(url, {method: "GET"}, MOD_DOWNLOAD_TIMEOUT);
        if (!response.ok) {
            throw new Error(`Unexpected response: ${response.statusText}`);
        }
        let bundle = await response.text();

        // We check if the bundle includes Vencord and not by the "modName" to patch Vencord forks too
        if (containsVencord(bundle) && !url.endsWith(".css")) {
            bundle = await patchVencord(bundle);
        }

        fs.promises.writeFile(filePath, bundle, "utf-8");
    } catch (error) {
        console.error(error);
        throw new Error("Failed to download and write bundle");
    }
}

function containsVencord(str: string) {
    // Get the first 150 characters of the string
    const substring = str.slice(0, 150);

    // Check if "Vencord" is present in the substring
    return substring.indexOf("Vencord") !== -1;
}

export async function installMods() {
    if (await getConfig("noBundleUpdates")) {
        console.log("[Mod loader] Skipping mod bundle update");
        return;
    }
    try {
        console.log("[Mod loader] Downloading mod bundle");
        const scriptFolder = path.join(app.getPath("userData"), "scripts/");
        const styleFolder = path.join(app.getPath("userData"), "styles/");

        const modName: keyof typeof MOD_BUNDLE_URLS = await getConfig("modName");
        if (modName === "custom") {
            MOD_BUNDLE_URLS.custom = await getConfig("customJsBundle");
            MOD_BUNDLE_CSS_URLS.custom = await getConfig("customCssBundle");
        }

        await downloadAndWriteBundle(MOD_BUNDLE_URLS[modName], path.join(scriptFolder, "BL0_"+modName+".js"));
        await downloadAndWriteBundle(MOD_BUNDLE_CSS_URLS[modName], path.join(styleFolder, modName+".css"));

        console.log("[Mod loader] Mod bundle updated");
    } catch (error) {
        console.error("[Mod loader] Failed to install mods");
        console.error(error);
        dialog.showErrorBox(
            "Oops, something went wrong.",
            "GoofCord couldn't install mods, please check if you have a stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
        );
    }
}