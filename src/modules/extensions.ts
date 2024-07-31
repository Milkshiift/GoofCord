import fs from "fs/promises";
import {dialog, session} from "electron";
import {getGoofCordFolderPath, readOrCreateFolder, tryWithFix} from "../utils";
import path from "path";
import {getConfig} from "../config";
import chalk from "chalk";

interface ModBundleUrls {
    [key: string]: [string | undefined, string | undefined];
}

const modNames: string[] = getConfig("modNames");
const extensionsFolder = path.join(getGoofCordFolderPath(), "extensions");
const MOD_BUNDLES_URLS: ModBundleUrls = {
    vencord: ["https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css"],
    equicord: ["https://github.com/Equicord/Equicord/releases/download/latest/browser.js", "https://github.com/Equicord/Equicord/releases/download/latest/browser.css"],
    shelter: ["https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js", undefined],
    custom: [getConfig("customJsBundle"), getConfig("customCssBundle")],
};

export async function loadExtensions(): Promise<void> {
    try {
        const files = await readOrCreateFolder(extensionsFolder);
        for (const file of files) {
            await session.defaultSession.loadExtension(path.join(extensionsFolder, file));
            console.log(chalk.yellow("[Mod Loader]"), `Loaded extension: ${file}`);
        }
    } catch (e) {
        console.error("[Mod Loader] Failed to load extensions:", e);
    }
}

async function downloadBundles(urls: Array<string | undefined>, destFolder: string) {
    if (getConfig("noBundleUpdates")) {
        console.log(chalk.yellow("[Mod Loader]"), "Skipping bundle download for:", destFolder);
        return;
    }
    console.log(chalk.yellow("[Mod Loader]"), "Downloading mod bundles for:", destFolder);
    const filePath = path.join(extensionsFolder, destFolder, "dist");
    for (const url of urls) {
        if (!url) continue;
        try {
            const response = await fetch(url);
            let bundle = await response.text();

            await tryWithFix(
                async () => await fs.writeFile(path.join(filePath, `bundle${path.extname(url)}`), bundle, "utf-8"),
                async () => await installModLoader(destFolder),
                `Failed to write bundle for ${destFolder}`
            );
        } catch (e: any) {
            console.error("[Mod Loader] Failed to download bundle:", e);
            throw e;
        }
    }
    console.log(chalk.yellow("[Mod Loader]"), "Bundles downloaded for:", destFolder);
}

export async function updateMods() {
    const possibleMods = Object.keys(MOD_BUNDLES_URLS);
    for (const possibleMod of possibleMods) {
        if (modNames.includes(possibleMod)) {
            await downloadBundles(MOD_BUNDLES_URLS[possibleMod], possibleMod);
        } else {
            await fs.rm(path.join(extensionsFolder, possibleMod), { recursive: true, force: true });
        }
    }
}

async function installModLoader(name: string) {
    try {
        const folderContents = await readFolderIntoMemory(path.join(__dirname, "assets/loader"));
        const modPath = path.join(extensionsFolder, name);
        await writeFolderFromMemory(folderContents, modPath);
        await fs.mkdir(path.join(modPath, "dist"), { recursive: true });

        console.log(chalk.yellow("[Mod Loader]"), "Mod loader installed for:", name);
    } catch (error) {
        console.error("[Mod Loader] Failed to install the mod loader:",error);
        dialog.showErrorBox(
            "Oops, something went wrong.",
            `GoofCord couldn't install the internal mod loader.\n\n${error}`
        );
    }
}

async function readFolderIntoMemory(folderPath: string): Promise<Record<string, Buffer | Record<string, unknown>>> {
    const files = await fs.readdir(folderPath);
    const folderContents: Record<string, Buffer | Record<string, unknown>> = {};

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
            folderContents[file] = await fs.readFile(filePath);
        } else if (stats.isDirectory()) {
            folderContents[file] = await readFolderIntoMemory(filePath);
        }
    }

    return folderContents;
}

async function writeFolderFromMemory(folderContents: Record<string, Buffer | Record<string, unknown>>, targetPath: string): Promise<void> {
    await fs.mkdir(targetPath, { recursive: true });

    for (const [fileName, content] of Object.entries(folderContents)) {
        const targetFilePath = path.join(targetPath, fileName);

        if (Buffer.isBuffer(content)) {
            await fs.writeFile(targetFilePath, content);
        } else {
            await fs.mkdir(targetFilePath, { recursive: true });
            await writeFolderFromMemory(content as Record<string, Buffer | Record<string, unknown>>, targetFilePath);
        }
    }
}
