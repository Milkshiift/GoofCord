import { Notification, shell } from "electron";
import { getConfig } from "../config";
import { isSemverLower, packageVersion } from "../utils";

async function getLatestVersion(): Promise<string> {
	try {
		const response = await fetch("https://api.github.com/repos/Milkshiift/GoofCord/releases/latest");
		const data = await response.json();
		return data.tag_name.replace("v", "");
	} catch (e) {
		console.error("Failed to fetch the latest GitHub release information. Possibly API rate limit exceeded or timeout reached");
		return packageVersion;
	}
}

export async function checkForUpdate() {
	if (!getConfig("updateNotification")) return;

	if (isSemverLower(packageVersion, await getLatestVersion())) {
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
