import path from "path";
import {app, ipcMain, ipcRenderer, shell} from "electron";
import fs from "fs";
import {addScript, readOrCreateFolder} from "../utils";
import {error, log} from "./logger";
import chalk from "chalk";
import {getConfig} from "../config";

export const enabledScripts: string[][] = [];
ipcMain.handle("getScripts", () => {
    return enabledScripts;
});

const scriptsFolder = path.join(app.getPath("userData"), "/scripts/");

export async function categorizeScripts() {
    const files = await readOrCreateFolder(scriptsFolder);
    for (const file of files) {
        try {
            const filePath = path.join(scriptsFolder, file);

            const scriptsForRemoval = ["10_screenshareQuality.js", "11_dynamicIcon.js", "12_consoleSupressor.js", "13_messageEncryption.js", "14_invidiousEmbeds.js", "15_richPresence.js"]
            if (scriptsForRemoval.includes(file)) {
                void shell.trashItem(filePath);
                continue;
            }

            if (!file.endsWith(".js")) {
                continue;
            }

            const scriptContent = modifyScriptContent(await fs.promises.readFile(filePath, "utf-8"));

            enabledScripts.push([file, scriptContent]);
        } catch (err) {
            error("An error occurred during script categorizing: " + err);
        }
    }
    console.log(chalk.yellowBright("[Script Loader]"), "Categorized scripts");
}

function modifyScriptContent(content: string) {
    content = "(async function(){" + content + "})();"; // Turning the script into an IIFE so variable names don't overlap
    return content;
}
