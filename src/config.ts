import fs from "node:fs";
import path from "node:path";
import { app, dialog, ipcRenderer, shell } from "electron";
import type { Config, ConfigKey } from "./configTypes";
import { settingsSchema } from "./settingsSchema";
import { getErrorMessage, getGoofCordFolderPath, tryCreateFolder } from "./utils";

export let cachedConfig: Config;
export let firstLaunch = false;

async function handleConfigError(e: unknown) {
	if (e instanceof Error && "code" in e && e.code === "ENOENT") {
		// Config file does not exist
		tryCreateFolder(getGoofCordFolderPath());
		await setup();
	} else {
		console.error("Failed to load the config:", e);

		await app.whenReady();

		const buttonId = dialog.showMessageBoxSync({
			type: "question",
			buttons: ["Try again", "Open config folder", "Reset config", "Exit"],
			defaultId: 0,
			title: "Failed to load configuration",
			message: `Config loader errored:\n${getErrorMessage(e)}`,
		});

		switch (buttonId) {
			case 1:
				await shell.openPath(getGoofCordFolderPath());
				break;
			case 2:
				await setup();
				break;
			case 3:
				app.exit();
				return true;
		}
	}
}

export async function loadConfig(): Promise<void> {
	while (true) {
		try {
			// I don't know why but specifically in this scenario using fs.promises.readFile is whopping 180 ms compared to ~1 ms using fs.readFileSync
			// Related? https://github.com/nodejs/performance/issues/151
			const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
			// Read config *can* be of type other than "Config" if the user modifies it but that doesn't concern us :3
			cachedConfig = JSON.parse(rawData);
			return; // Success, exit the function
		} catch (e: unknown) {
			const shouldExit = await handleConfigError(e);
			if (shouldExit) break;
		}
	}
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
	} catch (e: unknown) {
		console.error("setConfig function errored:", e);
		dialog.showErrorBox("GoofCord was unable to save the settings", getErrorMessage(e));
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
	} catch (e: unknown) {
		console.error("setConfigBulk function errored:", e);
		dialog.showErrorBox("GoofCord was unable to save the settings", getErrorMessage(e));
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

	for (const category in settingsSchema) {
		const categorySettings = settingsSchema[category];
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
