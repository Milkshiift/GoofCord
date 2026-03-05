import { i } from "@root/src/stores/localization/localization.main.ts";
import { Notification, shell } from "electron";

import { getConfig } from "../stores/config/config.main.ts";
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
			title: i("updateNotification-title"),
			body: i("updateNotification-body"),
			timeoutType: "default",
		});

		notification.on("click", () => {
			void shell.openExternal("https://github.com/Milkshiift/GoofCord/releases/latest");
		});

		notification.show();
	}
}

function isSemverLower(version1: string, version2: string): boolean {
	// Strip build metadata (+...)
	const v1 = version1.split('+', 1)[0];
	const v2 = version2.split('+', 1)[0];

	// Split on FIRST '-' only
	const [m1, p1 = ''] = v1.split('-', 2);
	const [m2, p2 = ''] = v2.split('-', 2);

	// === 1. Compare main version (major.minor.patch...) numerically ===
	const parts1 = m1.split('.').map(Number);
	const parts2 = m2.split('.').map(Number);

	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const a = parts1[i] ?? 0;
		const b = parts2[i] ?? 0;
		if (a !== b) return a < b;
	}

	// Main versions are equal → move to pre-release rules
	if (!p1 && !p2) return false;     // both stable → not lower
	if (!p1) return false;            // v1 stable > any pre-release
	if (!p2) return true;             // v1 pre-release < stable v2

	// === 2. Both have pre-releases – compare identifiers ===
	const pr1 = p1.split('.');
	const pr2 = p2.split('.');

	for (let i = 0; i < Math.max(pr1.length, pr2.length); i++) {
		const a = pr1[i];
		const b = pr2[i];

		if (a === undefined) return true;   // shorter prefix is lower
		if (b === undefined) return false;

		const isNumA = /^[0-9]+$/.test(a);
		const isNumB = /^[0-9]+$/.test(b);

		if (isNumA && isNumB) {
			const diff = Number(a) - Number(b);
			if (diff !== 0) return diff < 0;
		} else if (isNumA !== isNumB) {
			return isNumA;                    // numeric identifier always lower than non-numeric
		} else if (a !== b) {
			return a < b;                     // lexical (pure ASCII) compare
		}
	}

	return false; // identical pre-releases
}
