import path from "path";
import {app, ipcMain, ipcRenderer} from "electron";
import {addScript, fetchWithTimeout, getConfig, packageVersion, streamPipeline} from "../utils";
import {error, log} from "./logger";
import extract from "extract-zip";
import fs from "graceful-fs";
import {isSemverLower} from "./updateCheck";

// ----------------- MAIN -----------------
export const scriptCategories = {
    beforeLoadScripts: [] as [string, string][],
    afterLoadScripts: [] as [string, string][],
    scriptsCombined: [] as [string, string][],
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
            const scriptContent = await fs.promises.readFile(filePath, "utf-8");

            // Don't load scripts if this GoofCord version is lower than specified
            const scriptInfo = parseScriptInfo(scriptContent);
            if (scriptInfo.minGCVer !== "" && isSemverLower(packageVersion, scriptInfo.minGCVer)) continue;

            if (file.includes("BL")) {
                scriptCategories.beforeLoadScripts.push([file, scriptContent]);
            } else {
                scriptCategories.afterLoadScripts.push([file, scriptContent]);
            }
            scriptCategories.scriptsCombined.push([file, scriptContent]);
        } catch (err) {
            error("An error occurred during script categorizing: " + err);
        }
    }
    sendScriptArraysToRenderer();
}

// GoofMod installer. Runs from main.ts
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
                    await fs.promises.unlink(path.join(scriptsFolder, updatedScripts[updatedScriptIndex]));
                }
            }
        }

        console.log("[Script Loader] Successfully installed default scripts");
    } catch (error) {
        console.error("[Script Loader] Failed to install default scripts");
        console.error(error);
    }
}

// Function to send script arrays to the renderer process
function sendScriptArraysToRenderer() {
    ipcMain.handle("get-script-objects", () => {
        return scriptCategories;
    });
}

// ----------------- RENDERER -----------------

// Function to load scripts from the specified array (either BL or AL). Runs from a renderer process (preload.ts)
export async function loadScripts(scriptType: boolean) {
    if (await getConfig("scriptLoading") === false) return;

    // Request scripts object from the main process
    const { afterLoadScripts, beforeLoadScripts } = await ipcRenderer.invoke("get-script-objects");

    const scriptsToLoad = scriptType ? afterLoadScripts : beforeLoadScripts;

    for (const [scriptName, scriptContent] of scriptsToLoad) {
        const scriptInfo = parseScriptInfo(scriptContent);

        addScript(modifyScriptContent(scriptContent));

        if (scriptInfo.name === "") {
            log(`Loaded ${scriptName} script. Version: Unknown`);
        } else {
            log(`Loaded "${scriptInfo.name}" script. Version: ${scriptInfo.version}`);
        }
    }
}

function parseScriptInfo(scriptContent: string) {
    const scriptInfo = { name: "", version: "", minGCVer: ""};
    let linesProcessed = 0;
    const MAX_LINES = 10;

    for (const line of scriptContent.split("\n")) {
        if (linesProcessed >= MAX_LINES) break; // Only parse the first N lines

        const match = line.match(/^\s*\*\s*@(\w+)\s+(.*)/);
        if (match) {
            const [, key, value] = match;
            if (key === "name" && !scriptInfo.name) {
                scriptInfo.name = value.trim();
                linesProcessed++;
            } else if (key === "version" && !scriptInfo.version) {
                scriptInfo.version = value.trim();
                linesProcessed++;
            } else if (key === "minGCVer" && !scriptInfo.minGCVer) {
                scriptInfo.minGCVer = value.trim();
                linesProcessed++;
            }
        }
    }

    return scriptInfo;
}

function modifyScriptContent(content: string) {
    content = "(function(){" + content + "})();"; // Turning a script into an IIFE so variable names don't overlap
    return content;
}