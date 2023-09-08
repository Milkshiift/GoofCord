import fetch from 'cross-fetch';
import {getVersion} from "../utils";
import {shell} from "electron";
const { Notification } = require('electron')

const currentVersion = getVersion();

async function getLatestVersion(): Promise<string> {
    const response = await fetch('https://api.github.com/repos/Milkshiift/GoofCord/releases/latest');
    const data = await response.json();
    return data.tag_name.replace("v", "");
}

export async function checkForUpdate() {
    const latestVersion = await getLatestVersion();
    const isLower = isSemverLower(currentVersion, latestVersion);

    if (isLower) {
        let notification = new Notification({
            title: "New update is available ✨",
            body: "Click on the notification to download",
            timeoutType: "never"
        })

        notification.on("click", () => {
            shell.openExternal("https://github.com/Milkshiift/GoofCord/releases/latest");
        });

        notification.show()
    }
}

function isSemverLower(version1: string, version2: string): boolean {
    const v1Parts = version1.split('.');
    const v2Parts = version2.split('.');

    for (let i = 0; i < v1Parts.length; i++) {
        const v1Part = parseInt(v1Parts[i]);
        const v2Part = parseInt(v2Parts[i]);

        if (v1Part < v2Part) {
            return true;
        } else if (v1Part > v2Part) {
            return false;
        }
    }

    return false;
}