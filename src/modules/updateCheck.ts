import fetch from 'cross-fetch';
import semver from 'semver';
import {getVersion} from "../utils";
import {shell} from "electron";
const { Notification } = require('electron')

const currentVersion = getVersion();

async function getLatestVersion(): Promise<string> {
    const response = await fetch('https://api.github.com/repos/Milkshiift/GoofCord/releases/latest');
    const data = await response.json();
    return data.tag_name.replace("v", "");
}

async function compareVersions() {
    const latestVersion = await getLatestVersion();
    const isLower = semver.lt(currentVersion, latestVersion);

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

compareVersions();