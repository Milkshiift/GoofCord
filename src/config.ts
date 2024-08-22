import fs from "node:fs";
import path from "node:path";
import { dialog, ipcRenderer } from "electron";
import { getGoofCordFolderPath, tryWithFix } from "./utils";

export let cachedConfig: object = {};
export let firstLaunch = false;

export async function loadConfig() {
	await tryWithFix(
		() => {
			// I don't know why but specifically in this scenario using fs.promises.readFile is whopping 180 ms compared to ~1 ms using fs.readFileSync
			// Related? https://github.com/nodejs/performance/issues/151
			const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
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

export function getConfig(toGet: string): any {
	if (process.type !== "browser") return ipcRenderer.sendSync("config:getConfig", toGet);

	const result = cachedConfig[toGet];
	if (result !== undefined) {
		return result;
	}
	console.log("Missing config parameter:", toGet);
	void setConfig(toGet, getDefaultValue(toGet));
	return cachedConfig[toGet];
}

export async function setConfig(entry: string, value: unknown) {
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

export async function setConfigBulk(object: object) {
	try {
		if (process.type !== "browser") {
			return await ipcRenderer.invoke("config:setConfigBulk", object);
		}
		cachedConfig = object;
		const toSave = JSON.stringify(object, undefined, 2);
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

const defaults = {};
export function getDefaults() {
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

export function getDefaultValue(entry: string) {
	return getDefaults()[entry];
}

export function getConfigLocation(): string {
	return path.join(getGoofCordFolderPath(), "settings.json");
}
