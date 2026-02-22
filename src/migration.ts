import { deleteAssets } from "@root/src/modules/assets/assetLoader.ts";
import { cleanUpConfig, getConfig, getConfigRaw, getDefaultValue, setConfig } from "@root/src/stores/config/config.main.ts";
import { getVersion } from "@root/src/utils.ts";

export async function runMigrations() {
	const currentVersion = getVersion();
	const lastRunVersion = getConfigRaw("version");

	if (currentVersion !== lastRunVersion) {
		console.log(`Migrating from ${lastRunVersion} to ${currentVersion}`);

		// --------- 2.0.0 ---------
		// "version" config entry only added in 2.0.0
		// So we have to check by a property that existed pre 2.0.0
		if (
			// @ts-expect-error
			getConfigRaw("modNames") &&
			(lastRunVersion === undefined || parseVersion(lastRunVersion).major === 1)
		) {
			await deleteAssets(["shelter.js", "vencord.js", "vencord.css", "equicord.js", "equicord.css"]);
		}
		// -------------------------

		// --------- 2.0.2 ---------
		// The window state now includes window position
		// @ts-expect-error
		if (getConfig("windowState:main").length === 2) {
			await setConfig("windowState:main", getDefaultValue("windowState:main"));
		}
		// -------------------------

		// Removing obsolete entries on every update
		await cleanUpConfig();

		await setConfig("version", currentVersion);
	}
}

function parseVersion(versionStr: string) {
	const parts = versionStr.split(".");

	return {
		major: parseInt(parts[0] || "0", 10),
		minor: parseInt(parts[1] || "0", 10),
		patch: parseInt(parts[2] || "0", 10),
	};
}
