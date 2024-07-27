import path from "path";
import {ipcMain} from "electron";
import fs from "fs";
import {getGoofCordFolderPath, readOrCreateFolder} from "../utils";
import {error} from "./logger";
import chalk from "chalk";

export const enabledScripts: string[][] = [];
ipcMain.handle("getScripts", () => {
    return enabledScripts;
});

const scriptsFolder = path.join(getGoofCordFolderPath(), "scripts/");

export async function categorizeScripts() {
    const files = await readOrCreateFolder(scriptsFolder);
    for (const file of files) {
        try {
            const filePath = path.join(scriptsFolder, file);

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
