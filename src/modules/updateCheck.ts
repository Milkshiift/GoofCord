import { Notification, shell } from "electron";
import { getConfig } from "../config.ts";
import { getVersion } from "../utils.ts";

async function getLatestVersion(): Promise<string> {
	try {
		const response = await fetch("https://api.github.com/repos/Milkshiift/GoofCord/releases/latest");
		const data = await response.json();
		return data.tag_name.replace("v", "");
	} catch (e) {
		console.error("Failed to fetch the latest GitHub release information. Possibly API rate limit exceeded or timeout reached");
		return getVersion();
	}
}

export async function checkForUpdate() {
	if (!getConfig("updateNotification")) return;

	if (isSemverLower(getVersion(), await getLatestVersion())) {
		const notification = new Notification({
			title: "A new update is available ✨",
			body: "Click on the notification to download",
			timeoutType: "default",
		});

		notification.on("click", () => {
			shell.openExternal("https://github.com/Milkshiift/GoofCord/releases/latest");
		});

		notification.show();
	}
}

function isSemverLower(version1: string, version2: string): boolean {
	const v1Parts = version1.split(".").map(Number);
	const v2Parts = version2.split(".").map(Number);

	for (let i = 0; i < v1Parts.length; i++) {
		const v1Part = v1Parts[i];
		const v2Part = v2Parts[i];

		if (v1Part < v2Part) {
			return true;
		}
		if (v1Part > v2Part) {
			return false;
		}
	}

	return false;
}