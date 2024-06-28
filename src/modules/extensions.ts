import fs from "fs";
import {app, dialog, session} from "electron";
import {fetchWithTimeout, readOrCreateFolder, tryWithFix} from "../utils";
import path from "path";
import {getConfig, getDefaultValue} from "../config";
import chalk from "chalk";

const modNames: string[] = getConfig("modNames");
const extensionsFolder = path.join(app.getPath("userData"), "extensions/");
const MOD_BUNDLES_URLS = {
    vencord: ["https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css"],
    equicord: ["https://github.com/Equicord/Equicord/releases/download/latest/browser.js", "https://github.com/Equicord/Equicord/releases/download/latest/browser.css"],
    shelter: ["https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js", undefined],
    custom: [getConfig("customJsBundle"), getConfig("customCssBundle")],
};
const EXTENSION_DOWNLOAD_TIMEOUT = 10000;

export async function loadExtensions() {
    try {
        for (const file of (await readOrCreateFolder(extensionsFolder))) {
            await session.defaultSession.loadExtension(path.join(extensionsFolder, file));
            console.log(chalk.yellow("[Mod Loader]"), `Loaded extension: ${file}`);
        }
    } catch (e: any) {
        console.error("[Mod Loader] Failed to load extensions:", e);
    }
}

async function downloadBundles(urls: Array<string | undefined>, destFolder: string) {
    console.log(chalk.yellow("[Mod Loader]"), "Downloading mod bundles for:", destFolder);
    const filePath = path.join(extensionsFolder, destFolder+"/dist/")
    try {
        for (const url of urls) {
            if (!url) continue;

            const response = await fetchWithTimeout(url, {method: "GET"}, EXTENSION_DOWNLOAD_TIMEOUT);
            let bundle = await response.text();

            await tryWithFix(async () => {
                await fs.promises.writeFile(filePath+"bundle"+path.extname(url), bundle, "utf-8");
            }, async ()=>{await installModLoader(destFolder)}, "[Mod Loader] Failed to write bundles:");
        }
    } catch (e: any) {
        console.error("[Mod Loader] Failed to download bundles:", e);
        throw e;
    }
    console.log(chalk.yellow("[Mod Loader]"), "Bundles downloaded for:", destFolder);
}

export async function updateMods() {
    if (getConfig("noBundleUpdates") || modNames.length === 0) {
        console.log(chalk.yellow("[Mod Loader]"), "Skipping mod bundle update");
        return;
    }
    const possibleMods = Object.keys(MOD_BUNDLES_URLS);
    for (const possibleMod of possibleMods) {
        if (modNames.includes(possibleMod)) {
            void downloadBundles(MOD_BUNDLES_URLS[possibleMod], possibleMod);
            continue;
        }
        void fs.promises.rm(path.join(extensionsFolder, possibleMod), {recursive: true, force: true});
    }
}

async function installModLoader(name: string) {
    try {
        const folderContents = await readFolderIntoMemory(path.join(__dirname, "assets/loader"));
        await writeFolderFromMemory(folderContents, extensionsFolder + name);

        console.log(chalk.yellow("[Mod Loader]"), "Mod loader installed for:", name);
    } catch (error) {
        console.error("[Mod Loader] Failed to install the mod loader:",error);
        dialog.showErrorBox(
            "Oops, something went wrong.",
            `GoofCord couldn't install the internal mod loader.\n\n${error}`
        );
    }
}

async function readFolderIntoMemory(folderPath: string) {
    const files = await fs.promises.readdir(folderPath);
    const folderContents = {};

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.isFile()) {
            folderContents[file] = await fs.promises.readFile(filePath);
        } else if (stats.isDirectory()) {
            folderContents[file] = await readFolderIntoMemory(filePath); // Recursively read subfolders
        }
    }

    return folderContents;
}

async function writeFolderFromMemory(folderContents: object, targetPath: string) {
    try {await fs.promises.mkdir(targetPath, { recursive: true });} catch(e){}
    for (const [fileName, content] of Object.entries(folderContents)) {
        const targetFilePath = path.join(targetPath, fileName);

        if (Buffer.isBuffer(content)) {
            // It's a file
            await fs.promises.writeFile(targetFilePath, content);
        } else {
            // It's a folder
            await fs.promises.mkdir(targetFilePath, { recursive: true });
            await writeFolderFromMemory(content, targetFilePath); // Recursively write subfolders
        }
    }
}
