import {app, dialog} from "electron";
import path from "path";
import * as fs from "fs-extra";
import {DEFAULTS, getConfig, getConfigLocation, setConfig, setup} from "./config";

export async function checkConfig() {
    await checkIfFoldersExist();
    await checkIfConfigExists();
    await checkIfConfigIsBroken();
    await checkConfigForMissingParams();
}

export async function checkIfConfigExists() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const settingsFile = storagePath + "settings.json";

    if (!fs.existsSync(settingsFile)) {
        console.log("First run of GoofCord. Starting setup.");
        await setup();
    }
}

export async function checkIfConfigIsBroken(): Promise<void> {
    try {
        const rawData = await fs.promises.readFile(getConfigLocation(), "utf-8");
        JSON.parse(rawData);
    } catch (e) {
        console.error(e);
        console.log("Detected a corrupted config");
        await setup();
        dialog.showErrorBox(
            "Oops, something went wrong.",
            "GoofCord has detected that your configuration file is corrupted, please restart the app and set your settings again. If this issue persists, report it on the support server/Github issues."
        );
    }
}

export async function checkIfFoldersExist() {
    const userDataPath = app.getPath("userData");
    const foldersToCheck = ["storage", "scripts", "styles", "extensions"];

    for (const folderName of foldersToCheck) {
        const folderPath = path.join(userDataPath, folderName);
        const exists = await fs.pathExists(folderPath);

        if (!exists) {
            await fs.promises.mkdir(folderPath);
            console.log(`Created missing ${folderName} folder`);
        }
    }
}

export async function checkConfigForMissingParams() {
    const REQUIRED_PARAMETERS: string[] = Object.keys(DEFAULTS);
    for (const PARAMETER of REQUIRED_PARAMETERS) {
        if ((await getConfig(PARAMETER)) == undefined) {
            console.error(`Missing parameter: ${PARAMETER}`);
            await setConfig(PARAMETER, DEFAULTS[PARAMETER]);
        }
    }
}