import { Notification, shell } from "electron";
import { getConfig } from "../config.ts";
import { getVersion } from "../utils.ts";
import { i } from "./localization.ts";

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
			shell.openExternal("https://github.com/Milkshiift/GoofCord/releases/latest");
		});

		notification.show();
	}
}

function isSemverLower(version1: string, version2: string): boolean {
	function compareParts(a: string | number | undefined, b: string | number | undefined): number {
		const aNum = typeof a === "number" || (typeof a === "string" && !Number.isNaN(Number(a)));
		const bNum = typeof b === "number" || (typeof b === "string" && !Number.isNaN(Number(b)));

		if (aNum && bNum) return (Number(a) ?? 0) - (Number(b) ?? 0);
		if (aNum) return -1;
		if (bNum) return 1;
		return String(a ?? "").localeCompare(String(b ?? ""));
	}

	function compareVersionParts(v1: string, v2: string): boolean {
		const [v1Main, v1Pre] = v1.split("-");
		const [v2Main, v2Pre] = v2.split("-");

		const v1MainParts = v1Main.split(".").map(Number);
		const v2MainParts = v2Main.split(".").map(Number);

		const v1IsPreRelease = v1Pre !== undefined;
		const v2IsPreRelease = v2Pre !== undefined;

		if (!v1IsPreRelease && v2IsPreRelease) {
			return false;
		}
		if (v1IsPreRelease && !v2IsPreRelease) {
			return true;
		}

		for (let i = 0; i < Math.max(v1MainParts.length, v2MainParts.length); i++) {
			const cmp = compareParts(v1MainParts[i], v2MainParts[i]);
			if (cmp !== 0) return cmp < 0;
		}
		const v1PreParts = v1Pre ? v1Pre.split(".") : [];
		const v2PreParts = v2Pre ? v2Pre.split(".") : [];

		if (!v1Pre && v2Pre) return false;
		if (v1Pre && !v2Pre) return true;

		for (let i = 0; i < Math.max(v1PreParts.length, v2PreParts.length); i++) {
			const cmp = compareParts(v1PreParts[i], v2PreParts[i]);
			if (cmp !== 0) return cmp < 0;
		}

		return false;
	}

	return compareVersionParts(version1, version2);
}
