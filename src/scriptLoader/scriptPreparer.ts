import path from "path";
import {app, ipcMain} from "electron";
import fs from "fs-extra";
import {isSemverLower} from "../modules/updateCheck";
import {fetchWithTimeout, packageVersion, streamPipeline} from "../utils";
import {error} from "../modules/logger";
import extract from "extract-zip";
import {getConfig} from "../config/config";

type ScriptInfo = {
    name: string;
    version: string;
    minGCVer: string;
};

export const scriptCategories = {
    beforeLoadScripts: [] as [string, string, ScriptInfo][],
    afterLoadScripts: [] as [string, string, ScriptInfo][],
    scriptsCombined: [] as string[],
    disabledScripts: [] as string[]
};

export async function categorizeScripts() {
    const scriptsPath = path.join(app.getPath("userData"), "/scripts/");
    const files = await fs.promises.readdir(scriptsPath);

    for (const file of files) {
        try {
            if (!file.endsWith(".js")) {
                if (file.endsWith(".disabled")) {
                    scriptCategories.disabledScripts.push(file);
                }
                continue;
            }

            const filePath = path.join(scriptsPath, file);
            const scriptContent = modifyScriptContent(await fs.promises.readFile(filePath, "utf-8"));

            // Don't load scripts if this GoofCord version is lower than specified
            const scriptInfo = parseScriptInfo(scriptContent);
            if (scriptInfo.minGCVer !== "" && isSemverLower(packageVersion, scriptInfo.minGCVer)) continue;

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

// Runs from main.ts
export async function installDefaultScripts() {
    if (await getConfig("autoUpdateDefaultScripts") === false) return;

    const scriptsFolder = path.join(app.getPath("userData"), "scripts/");
    const zipPath = path.join(app.getPath("temp"), "defaultScripts.zip");
    try {
        const defaultScriptsZip = await fetchWithTimeout("https://github.com/Milkshiift/GoofCord-Scripts/releases/download/Main/patches.zip");
        await streamPipeline(defaultScriptsZip.body, fs.createWriteStream(zipPath));

        const updatedScripts: string[] = [];
        const onEntry = function (entry: any) {
            updatedScripts.push(entry.fileName);
        };

        await extract(zipPath, { dir: scriptsFolder, onEntry: onEntry });

        // A not so very smart way of ignoring disabled scripts
        for (const disabledScriptIndex in scriptCategories.disabledScripts) {
            for (const updatedScriptIndex in updatedScripts) {
                if (scriptCategories.disabledScripts[disabledScriptIndex].includes(updatedScripts[updatedScriptIndex])) {
                    fs.promises.unlink(path.join(scriptsFolder, updatedScripts[updatedScriptIndex]));
                }
            }
        }

        console.log("[Script Loader] Successfully installed default scripts");
    } catch (error) {
        console.error("[Script Loader] Failed to install default scripts");
        console.error(error);
    }
}

function modifyScriptContent(content: string) {
    content = "(function(){" + content + "})();"; // Turning the script into an IIFE so variable names don't overlap
    return content;
}

function parseScriptInfo(scriptContent: string) {
    const scriptInfo: ScriptInfo = { name: "", version: "", minGCVer: ""};
    let linesProcessed = 0;
    const MAX_LINES = 10;

    for (const line of scriptContent.split("\n")) {
        if (linesProcessed >= MAX_LINES) break; // Only parse the first N lines

        const match = line.match(/^\s*\*\s*@(\w+)\s+(.*)/);
        if (match) {
            const [, key, value] = match;
            if (key === "name" && !scriptInfo.name) {
                scriptInfo.name = value.trim();
            } else if (key === "version" && !scriptInfo.version) {
                scriptInfo.version = value.trim();
            } else if (key === "minGCVer" && !scriptInfo.minGCVer) {
                scriptInfo.minGCVer = value.trim();
            }
        }
        linesProcessed++;
    }

    return scriptInfo;
}