import {fetchWithTimeout, packageVersion} from "../utils";
import {Notification, shell} from "electron";

async function getLatestVersion(): Promise<string> {
    const response = await fetchWithTimeout("https://api.github.com/repos/Milkshiift/GoofCord/releases/latest");
    const data = await response.json();
    return data.tag_name.replace("v", "");
}

export async function checkForUpdate() {
    const isLower = isSemverLower(packageVersion, await getLatestVersion());

    if (isLower) {
        const notification = new Notification({
            title: "A new update is available ✨",
            body: "Click on the notification to download",
            timeoutType: "default"
        });

        notification.on("click", () => {
            shell.openExternal("https://github.com/Milkshiift/GoofCord/releases/latest");
        });

        notification.show();
    }
}

export function isSemverLower(version1: string, version2: string): boolean {
    const v1Parts = version1.split(".");
    const v2Parts = version2.split(".");

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