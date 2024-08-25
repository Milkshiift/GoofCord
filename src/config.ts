import fs from "node:fs";
import path from "node:path";
import { dialog, ipcRenderer } from "electron";
import { getGoofCordFolderPath, tryWithFix } from "./utils";
import type { Config, ConfigKey } from "./configTypes";

export let cachedConfig: Config;
export let firstLaunch = false;

export async function loadConfig() {
	await tryWithFix(
		() => {
			// I don't know why but specifically in this scenario using fs.promises.readFile is whopping 180 ms compared to ~1 ms using fs.readFileSync
			// Related? https://github.com/nodejs/performance/issues/151
			const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
			// Read config *can* be of type other than "Config" if the user modifies it but that doesn't concern us :3
			cachedConfig = JSON.parse(rawData);
		},
		tryFixErrors,
		"GoofCord was unable to load the config: ",
	);
}

async function tryFixErrors() {
	// This covers: missing settings.json, missing storage folder, corrupted settings.json (parsing error)
	await setup();
}

// Should be avoided. Use the type safe `getConfig` instead.
export function getConfigDynamic(toGet: string): unknown {
	if (process.type !== "browser") return ipcRenderer.sendSync("config:getConfig", toGet);

	const result = cachedConfig[toGet];
	if (result !== undefined) return result;
	console.log("Missing config parameter:", toGet);
	void setConfigDynamic(toGet, getDefaultValue(toGet));
	return cachedConfig[toGet];
}

export function getConfig<K extends ConfigKey>(toGet: K): Config[K] {
	if (process.type !== "browser") return ipcRenderer.sendSync("config:getConfig", toGet) as Config[K];

	const result = cachedConfig[toGet];
	if (result !== undefined) return result;
	console.log("Missing config parameter:", toGet);
	void setConfig(toGet, getDefaultValue(toGet));
	return cachedConfig[toGet] as Config[K];
}

// Should be avoided. Use the type safe `setConfig` instead.
export async function setConfigDynamic(entry: string, value: unknown) {
	await setConfig(entry as ConfigKey, value as Config[ConfigKey]);
}

export async function setConfig<K extends ConfigKey>(entry: K, value: Config[K]) {
	try {
		if (process.type !== "browser") {
			await ipcRenderer.invoke("config:setConfig", entry, value);
		}
		cachedConfig[entry] = value;
		const toSave = JSON.stringify(cachedConfig, undefined, 2);
		void fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
	} catch (e: any) {
		console.error("setConfig function errored:", e);
		dialog.showErrorBox("GoofCord was unable to save the settings", e.toString());
	}
}

export async function setConfigBulk(toSet: Config) {
	try {
		if (process.type !== "browser") {
			return await ipcRenderer.invoke("config:setConfigBulk", toSet);
		}
		cachedConfig = toSet;
		const toSave = JSON.stringify(toSet, undefined, 2);
		await fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
	} catch (e: any) {
		console.error("setConfigBulk function errored:", e);
		dialog.showErrorBox("GoofCord was unable to save the settings", e.toString());
	}
}

export async function setup() {
	console.log("Setting up default GoofCord settings.");
	firstLaunch = true;
	await setConfigBulk(getDefaults());
}

const defaults: Config = {} as Config;
export function getDefaults(): Config {
	// Caching
	if (Object.keys(defaults).length !== 0) {
		return defaults;
	}

	const settingsPath = path.join(__dirname, "/assets/settings.json");
	const settingsFile = fs.readFileSync(settingsPath, "utf-8");
	const settings = JSON.parse(settingsFile);
	for (const category in settings) {
		const categorySettings = settings[category];
		for (const setting in categorySettings) {
			defaults[setting] = categorySettings[setting].defaultValue;
		}
	}

	return defaults;
}

export function getDefaultValue<K extends ConfigKey>(entry: K): Config[K];
export function getDefaultValue(entry: string): unknown;
export function getDefaultValue(entry: string): unknown {
	return getDefaults()[entry];
}

export function getConfigLocation(): string {
	return path.join(getGoofCordFolderPath(), "settings.json");
}
