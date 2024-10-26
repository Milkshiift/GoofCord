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
	const parseVersion = (version: string) => {
		const [main, preRelease] = version.split("-");
		const mainParts = main.split(".").map(Number);
		const preReleaseParts = preRelease ? preRelease.split(".").map((p) => (Number.isNaN(Number(p)) ? p : Number(p))) : [];

		return { mainParts, preReleaseParts };
	};

	const compareParts = (part1: string | number, part2: string | number) => {
		if (typeof part1 === "number" && typeof part2 === "number") return part1 - part2;
		if (typeof part1 === "number") return -1;
		if (typeof part2 === "number") return 1;
		return part1.localeCompare(part2);
	};

	const { mainParts: v1Main, preReleaseParts: v1Pre } = parseVersion(version1);
	const { mainParts: v2Main, preReleaseParts: v2Pre } = parseVersion(version2);

	for (let i = 0; i < Math.max(v1Main.length, v2Main.length); i++) {
		const cmp = (v1Main[i] || 0) - (v2Main[i] || 0);
		if (cmp !== 0) return cmp < 0;
	}

	if (v1Pre.length === 0 && v2Pre.length > 0) return false;
	if (v1Pre.length > 0 && v2Pre.length === 0) return true;

	for (let i = 0; i < Math.max(v1Pre.length, v2Pre.length); i++) {
		const cmp = compareParts(v1Pre[i] || "", v2Pre[i] || "");
		if (cmp !== 0) return cmp < 0;
	}

	return false;
}
