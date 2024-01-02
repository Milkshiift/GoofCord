import * as fs from "fs-extra";
import {app, dialog, session} from "electron";
import {fetchWithTimeout, getConfig, streamPipeline} from "../utils";
import {patchVencord} from "./scriptLoader/vencordPatcher";
import path from "path";
import extract from "extract-zip";

export async function loadExtensions() {
    const userDataPath = app.getPath("userData");
    const extensionsFolder = userDataPath + "/extensions/";
    if (!fs.existsSync(extensionsFolder)) {
        await fs.promises.mkdir(extensionsFolder);
        console.log("Created missing extensions folder");
    }
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
    shelter: "https://armcord.xyz/placeholder.css",
    custom: "", // Initialize with an empty string and populate it later
};

const TIMEOUT = 10000;

async function downloadAndWriteBundle(url: string, filePath: string) {
    try {
        const response = await fetchWithTimeout(url, {method: "GET"}, TIMEOUT);
        if (!response.ok) {
            throw new Error(`Unexpected response: ${response.statusText}`);
        }
        let bundle = await response.text();

        const modName: keyof typeof MOD_BUNDLE_URLS = await getConfig("modName");
        if (modName === "vencord" && !url.endsWith(".css")) {
            bundle = await patchVencord(bundle);
        }

        await fs.promises.writeFile(filePath, bundle, "utf-8");
    } catch (error) {
        console.error(error);
        throw new Error("Failed to download and write bundle");
    }
}

async function updateModBundle() {
    if (await getConfig("noBundleUpdates")) {
        console.log("[Mod loader] Skipping mod bundle update");
        return;
    }

    try {
        console.log("[Mod loader] Downloading mod bundle");
        const distFolder = path.join(app.getPath("userData"), "extensions/loader/dist/");
        await fs.promises.mkdir(distFolder, {recursive: true});

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
            "GoofCord couldn't install mods, please check if you have a stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
        );
    }
}

export async function installModLoader() {
    const extensionFolder = path.join(app.getPath("userData"), "extensions/");
    const loaderFolder = path.join(extensionFolder, "loader");
    const distFolder = path.join(loaderFolder, "dist");
    const bundleCssPath = path.join(distFolder, "bundle.css");

    if (!fs.existsSync(loaderFolder) || !fs.existsSync(bundleCssPath)) {
        try {
            // Remove the existing loader folder recursively
            await fs.promises.rm(loaderFolder, {recursive: true, force: true});

            if (!fs.existsSync(extensionFolder)) {
                await fs.promises.mkdir(extensionFolder);
                console.log("[Mod loader] Created missing extension folder");
            }

            const zipPath = path.join(app.getPath("temp"), "loader.zip");
            const loaderZip = await fetchWithTimeout("https://armcord.xyz/loader.zip");

            if (!loaderZip.ok) throw new Error(`Unexpected response: ${loaderZip.statusText}`);

            await streamPipeline(loaderZip.body, fs.createWriteStream(zipPath));
            await extract(zipPath, {dir: path.join(app.getPath("userData"), "extensions")});
            await updateModBundle();
        } catch (error) {
            console.error("[Mod loader] Failed to install modloader");
            console.error(error);
            dialog.showErrorBox(
                "Oops, something went wrong.",
                "GoofCord couldn't install the internal mod loader, please check if you have a stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
            );
        }
    } else {
        await updateModBundle();
    }
}