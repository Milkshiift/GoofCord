import * as fs from "fs-extra";
import {app, dialog, session} from "electron";
import {fetchWithTimeout} from "../utils";
import {patchVencord} from "../scriptLoader/vencordPatcher";
import path from "path";
import {getConfig} from "../config/config";

export async function loadExtensions() {
    const userDataPath = app.getPath("userData");
    const extensionsFolder = path.join(userDataPath, "extensions/");
    for (const file of (await fs.promises.readdir(extensionsFolder))) {
        try {
            const manifest = await fs.promises.readFile(`${userDataPath}/extensions/${file}/manifest.json`, "utf8");
            const extensionFile = JSON.parse(manifest);
            await session.defaultSession.loadExtension(`${userDataPath}/extensions/${file}`);
            console.log(`[Mod loader] Loaded ${extensionFile.name} made by ${extensionFile.author}`);
        } catch (err) {
            console.error(err);
        }
    }
}

const MOD_BUNDLE_URLS = {
    none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
    vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
    shelter: "https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js",
    custom: "", // Initialize with an empty string and populate it later
};

const MOD_BUNDLE_CSS_URLS = {
    none: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
    vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
    shelter: "https://raw.githubusercontent.com/Milkshiift/GoofCord/main/src/content/css/empty.css",
    custom: "", // Initialize with an empty string and populate it later
};

const EXTENSION_DOWNLOAD_TIMEOUT = 10000;

async function downloadAndWriteBundle(url: string, filePath: string) {
    try {
        const response = await fetchWithTimeout(url, {method: "GET"}, EXTENSION_DOWNLOAD_TIMEOUT);
        if (!response.ok) {
            throw new Error(`Unexpected response: ${response.statusText}`);
        }
        let bundle = await response.text();

        if (containsVencord(bundle) && !url.endsWith(".css")) {
            bundle = await patchVencord(bundle);
        }

        fs.promises.writeFile(filePath, bundle, "utf-8");
    } catch (error) {
        console.error(error);
        throw new Error(error?.toString());
    }
}

function containsVencord(str: string) {
    // Get the first 150 characters of the string
    const substring = str.slice(0, 150);
    // Check if "Vencord" is present in the substring
    return substring.indexOf("Vencord") !== -1;
}

async function updateModBundle() {
    if (await getConfig("noBundleUpdates")) {
        console.log("[Mod loader] Skipping mod bundle update");
        return;
    }

    try {
        console.log("[Mod loader] Downloading mod bundle");
        const distFolder = path.join(app.getPath("userData"), "extensions/loader/dist/");

        const modName: keyof typeof MOD_BUNDLE_URLS = await getConfig("modName");
        if (modName === "custom") {
            MOD_BUNDLE_URLS.custom = await getConfig("customJsBundle");
            MOD_BUNDLE_CSS_URLS.custom = await getConfig("customCssBundle");
        }

        await downloadAndWriteBundle(MOD_BUNDLE_URLS[modName], path.join(distFolder, "bundle.js"));
        await downloadAndWriteBundle(MOD_BUNDLE_CSS_URLS[modName], path.join(distFolder, "bundle.css"));

        console.log("[Mod loader] Mod bundle updated");
    } catch (error) {
        console.error("[Mod loader] Failed to install mods");
        console.error(error);
        dialog.showErrorBox(
            "Oops, something went wrong.",
            `GoofCord couldn't install mods, please check if you have a stable internet connection and restart the app.\n\n${error}`
        );
    }
}

export async function installModLoader() {
    const extensionFolder = path.join(app.getPath("userData"), "extensions/");
    const loaderFolder = path.join(extensionFolder, "loader");

    if (!fs.existsSync(loaderFolder)) {
        try {
            const loaderFolderPath = path.join(__dirname, "../", "/assets/js/modLoader");
            await fs.copy(loaderFolderPath, extensionFolder);

            console.log("[Mod loader] Mod loader installed");

            await updateModBundle();
        } catch (error) {
            console.error("[Mod loader] Failed to install the mod loader");
            console.error(error);
            dialog.showErrorBox(
                "Oops, something went wrong.",
                `GoofCord couldn't install the internal mod loader.\n\n${error}`
            );
        }
    } else {
        await updateModBundle();
    }
}