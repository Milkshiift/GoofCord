import path from "path";
import {app, ipcMain, shell} from "electron";
import fs from "fs";
import {getVersion, readOrCreateFolder} from "../utils";
import {error} from "../modules/logger";
import {getConfig} from "../config";
import download from "github-directory-downloader";
import chalk from "chalk";

export const enabledScripts: string[][] = [];
export const disabledScripts: string[] = [];
ipcMain.handle("getScripts", () => {
    return enabledScripts;
});

const scriptsFolder = path.join(app.getPath("userData"), "/scripts/");

export async function categorizeScripts() {
    const files = await readOrCreateFolder(scriptsFolder);
    for (const file of files) {
        try {
            const filePath = path.join(scriptsFolder, file);

            // 1.4.0 changed the naming of the scripts, so when they autoupdate they don't replace the old 1.3.0 ones, creating a duplicate
            // This is a bad temporary solution for that
            if (getConfig("autoUpdateDefaultScripts") && /(AL|BL)1[0-2]/.test(file)) {
                void shell.trashItem(filePath);
                continue;
            }

            if (!file.endsWith(".js")) {
                if (file.endsWith(".disabled")) {
                    disabledScripts.push(file.replace(".disabled", ""));
                }
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

export async function installDefaultScripts() {
    if (getConfig("autoUpdateDefaultScripts") === false || getConfig("scriptLoading") === false) return;

    try {
        // GoofCord-Scripts repo has a branch for every minor and major version of GoofCord since 1.3.0
        // That way scripts can use the newest features while remaining compatible with older versions
        await download(`https://github.com/Milkshiift/GoofCord-Scripts/tree/${changePatchVersionToZero(getVersion())}/patches`, scriptsFolder, disabledScripts);

        console.log(chalk.yellowBright("[Script Loader]"), "Successfully installed default scripts");
    } catch (error: any) {
        console.error("[Script Loader] Failed to install default scripts", error);
    }
}

function changePatchVersionToZero(version: string): string {
    const parts = version.split(".");
    parts[2] = "0"; // Set patch version to 0
    return parts.join(".");
}

function modifyScriptContent(content: string) {
    content = "(async function(){" + content + "})();"; // Turning the script into an IIFE so variable names don't overlap
    return content;
}
