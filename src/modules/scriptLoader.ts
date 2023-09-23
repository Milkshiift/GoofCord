import path from "path";
import {app, ipcRenderer} from "electron";
import {addScript, fetchWithTimeout, streamPipeline} from "../utils";
import {error, log} from "./logger";
import extract from "extract-zip";
import fs from "graceful-fs";

// Script loading, executes from renderer process (preload.ts)
export async function loadScripts() {
    const scriptsPath = path.join(ipcRenderer.sendSync("get-user-data-path"), "/scripts/");

    const files = await fs.promises.readdir(scriptsPath);

    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        try {
            const scriptContent = await fs.promises.readFile(path.join(scriptsPath, file), "utf8");
            addScript(scriptContent);

            const scriptInfo = parseScriptInfo(scriptContent);
            if (scriptInfo.name === "") {
                log(`Loaded ${file} script. Version: ${scriptInfo.version}`);
            } else {
                log(`Loaded "${scriptInfo.name}" script. Version: ${scriptInfo.version}`);
            }
        } catch (err) {
            error("An error occurred during script loading: " + err);
        }
    }
}

// Probably a better way to parse the information
function parseScriptInfo(scriptContent: string) {
    const scriptInfo = { name: "", description: "", version: "" };
    let linesProcessed = 0;

    for (const line of scriptContent.split('\n')) {
        if (linesProcessed >= 10) break; // Only parse the first N lines

        const match = line.match(/^\s*\*\s*@(\w+)\s+(.*)/);
        if (match) {
            const [, key, value] = match;
            if (key === "name" && !scriptInfo.name) {
                scriptInfo.name = value.trim();
                linesProcessed++;
            } else if (key === "version" && !scriptInfo.version) {
                scriptInfo.version = value.trim();
                linesProcessed++;
            }
        }
    }

    return scriptInfo;
}

// GoofMod installer. Runs from main.ts
export async function installGoofmod() {
    const scriptsFolder = path.join(app.getPath('userData'), 'scripts/');
    const zipPath = path.join(app.getPath('temp'), 'goofmod.zip');

    try {
        const goofmodZip = await fetchWithTimeout('https://github.com/Milkshiift/GoofMod/releases/download/Build/goofmod.zip');
        await streamPipeline(goofmodZip.body, fs.createWriteStream(zipPath));
        await extract(zipPath, {dir: scriptsFolder});
        console.log("[Script Loader] Successfully installed GoofMod");
    } catch (error) {
        console.error('[Script Loader] Failed to install GoofMod');
        console.error(error);
    }
}