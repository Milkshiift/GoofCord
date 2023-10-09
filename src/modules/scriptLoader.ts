import path from "path";
import {app, ipcMain, ipcRenderer} from "electron";
import {addScript, fetchWithTimeout, sreamPipeline} from "../utils";
import {error, log} from "./logger";
import extract from "extract-zip";
import fs from "graceful-fs";


// ----------------- MAIN -----------------
const beforeLoadScripts: string[] = [];
const afterLoadScripts: string[] = [];

// Function to scan scripts in a folder and categorize them into beforeLoad and afterLoad arrays. Runs from main.ts
export async function categorizeScripts() {
    const scriptsPath = path.join(app.getPath("userData"), "/scripts/");
    const files = await fs.promises.readdir(scriptsPath);

    for (const file of files) {
        if (!file.endsWith(".js")) continue;
        try {
            if (file.includes("BL")) {
                beforeLoadScripts.push(file);
            }
            else { // Assume that scripts without specification are AL
                afterLoadScripts.push(file);
            }
        } catch (err) {
            error("An error occurred during script categorizing: " + err);
        }
    }
    sendScriptArraysToRenderer();
}

// GoofMod installer. Runs from main.ts
export async function installGoofmod() {
    const scriptsFolder = path.join(app.getPath("userData"), "scripts/");
    const zipPath = path.join(app.getPath("temp"), "goofmod.zip");

    try {
        const goofmodZip = await fetchWithTimeout("https://github.com/Milkshiift/GoofMod/releases/download/Build/goofmod.zip");
        await sreamPipeline(goofmodZip.body, fs.createWriteStream(zipPath));
        await extract(zipPath, {dir: scriptsFolder});
        console.log("[Script Loader] Successfully installed GoofMod");
    } catch (error) {
        console.error("[Script Loader] Failed to install GoofMod");
        console.error(error);
    }
}

// Function to send script arrays to the renderer process
function sendScriptArraysToRenderer() {
    ipcMain.handle("get-script-arrays", () => {
        return {
            beforeLoadScripts,
            afterLoadScripts
        };
    });
}

// ----------------- RENDERER -----------------

// Function to load scripts from the specified array (either BL or AL). Runs from renderer process (preload.ts)
export async function loadScripts(scriptType: boolean) { // false: BL true: AL
    // Request script arrays from the main process
    const {afterLoadScripts, beforeLoadScripts } = await ipcRenderer.invoke("get-script-arrays");
    const scriptsPath = path.join(ipcRenderer.sendSync("get-user-data-path"), "/scripts/");

    for (const scriptName of scriptType ? afterLoadScripts : beforeLoadScripts) {
        const scriptContent = await fs.promises.readFile(path.join(scriptsPath, scriptName), "utf8");
        addScript(scriptContent);

        const scriptInfo = parseScriptInfo(scriptContent);
        if (scriptInfo.name === "") {
            log(`Loaded ${scriptName} script. Version: Unknown`);
        } else {
            log(`Loaded "${scriptInfo.name}" script. Version: ${scriptInfo.version}`);
        }
    }
}

function parseScriptInfo(scriptContent: string) {
    const scriptInfo = { name: "", version: "" };
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
            }
        }
    }

    return scriptInfo;
}