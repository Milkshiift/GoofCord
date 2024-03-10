import path from "path";
import {app, dialog, ipcMain} from "electron";
import fs from "fs";
import {getVersion, isSemverLower, packageVersion, readOrCreateFolder} from "../utils";
import {error} from "../modules/logger";
import {getConfig} from "../config/config";
import download from "github-directory-downloader";

type ScriptInfo = {
    name: string;
    version: string;
    minGCVer: string;
    maxGCVer: string;
};

export const scriptCategories = {
    beforeLoadScripts: [] as [string, string, ScriptInfo][],
    afterLoadScripts: [] as [string, string, ScriptInfo][],
    scriptsCombined: [] as string[],
    disabledScripts: [] as string[]
};

const scriptsFolder = path.join(app.getPath("userData"), "/scripts/");

export async function categorizeScripts() {
    const files = await readOrCreateFolder(scriptsFolder);

    for (const file of files) {
        try {
            if (!file.endsWith(".js")) {
                if (file.endsWith(".disabled")) {
                    scriptCategories.disabledScripts.push(file.replace(".disabled", ""));
                }
                continue;
            }

            const filePath = path.join(scriptsFolder, file);
            const scriptContent = modifyScriptContent(await fs.promises.readFile(filePath, "utf-8"));

            // Don't load the script if this GoofCord version is lower than minGCVer or higher than maxGCVer
            const scriptInfo = parseScriptInfo(scriptContent);
            if (scriptInfo.minGCVer !== "" && isSemverLower(packageVersion, scriptInfo.minGCVer)) continue;
            if (scriptInfo.maxGCVer !== "" && !isSemverLower(packageVersion, scriptInfo.maxGCVer)) continue;

            if (file.includes("BL")) {
                scriptCategories.beforeLoadScripts.push([file, scriptContent, scriptInfo]);
            } else {
                scriptCategories.afterLoadScripts.push([file, scriptContent, scriptInfo]);
            }
            scriptCategories.scriptsCombined.push(scriptContent);
        } catch (err) {
            error("An error occurred during script categorizing: " + err);
        }
    }

    ipcMain.handle("getScriptCategories", () => {
        return scriptCategories;
    });
}

export async function installDefaultScripts() {
    if (getConfig("autoUpdateDefaultScripts") === false) return;

    try {
        console.log(scriptCategories.disabledScripts);
        await download(`https://github.com/Milkshiift/GoofCord-Scripts/tree/${getVersion()}/patches`, scriptsFolder, scriptCategories.disabledScripts);

        console.log("[Script Loader] Successfully installed default scripts");
    } catch (error: any) {
        console.error("[Script Loader] Failed to install default scripts", error);
        dialog.showErrorBox(
            "GoofCord was unable to install the default scripts",
            error.toString()
        );
    }
}

function modifyScriptContent(content: string) {
    content = "(function(){" + content + "})();"; // Turning the script into an IIFE so variable names don't overlap
    return content;
}

function parseScriptInfo(scriptContent: string) {
    const scriptInfo: ScriptInfo = { name: "", version: "", minGCVer: "", maxGCVer: "" };
    let linesProcessed = 0;
    const MAX_LINES = 7;

    for (const line of scriptContent.split("\n")) {
        if (linesProcessed >= MAX_LINES) break; // Only parse the first N lines

        const match = line.match(/^.\*.@(\w+)\s(.*)/);
        if (match) {
            const [, key, value] = match;
            scriptInfo[key as keyof ScriptInfo] = value.trim(); // Use keyof to ensure type safety
        }
        linesProcessed++;
    }

    return scriptInfo;
}