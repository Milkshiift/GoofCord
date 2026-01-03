import fs from "node:fs";
import path from "node:path";
import { app, dialog, shell } from "electron";
import { createHost, type StoreHost } from "electron-sync-store/main";
import { type Config, type ConfigKey, getDefaults } from "../../settingsSchema.ts";
import { getErrorMessage, getGoofCordFolderPath, tryCreateFolder } from "../../utils.ts";
import { AppConfigStore } from "./config.shared.ts";

export let firstLaunch = false;

export function getConfigLocation(): string {
	return path.join(getGoofCordFolderPath(), "settings.json");
}

async function setup(): Promise<Config> {
	console.log("Setting up default GoofCord settings.");
	firstLaunch = true;
	const defaults = getDefaults();
	await saveToDisk(defaults);
	return defaults;
}

async function saveToDisk(state: Config) {
	try {
		const toSave = JSON.stringify(state, undefined, 2);
		await fs.promises.writeFile(getConfigLocation(), toSave, "utf-8");
	} catch (e: unknown) {
		console.error("Failed to save settings:", e);
		dialog.showErrorBox("GoofCord was unable to save the settings", getErrorMessage(e));
	}
}

async function handleConfigError(e: unknown): Promise<{ retry: boolean; data?: Config }> {
	if (e instanceof Error && "code" in e && e.code === "ENOENT") {
		// Config file does not exist
		tryCreateFolder(getGoofCordFolderPath());
		const defaults = await setup();
		return { retry: false, data: defaults };
	}

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
		case 1: // Open folder
			void shell.openPath(getGoofCordFolderPath());
			return { retry: true };
		case 2: {
			// Reset
			const defaults = await setup();
			return { retry: false, data: defaults };
		}
		case 3: // Exit
			app.exit();
			throw new Error("Application exiting");
	}

	// Try again
	return { retry: true };
}

const DiskPersistence = {
	onHydrate: async (): Promise<Config> => {
		let loadedConfig: Config | null = null;

		do {
			try {
				// fs.promises.readFile is much slower than fs.readFileSync
				const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
				loadedConfig = JSON.parse(rawData) as Config;
			} catch (e: unknown) {
				const result = await handleConfigError(e);
				if (result.data) {
					loadedConfig = result.data;
				} else if (!result.retry) {
					loadedConfig = getDefaults();
				}
			}
		} while (!loadedConfig);

		return loadedConfig;
	},

	onPersist: async (state: Config) => {
		await saveToDisk(state);
	},
};

let configHost: StoreHost<Config>;

export async function loadConfig(): Promise<void> {
	configHost = createHost(AppConfigStore, DiskPersistence);
	await configHost.ready();
}

export function getConfig<K extends ConfigKey>(key: K, bypassDefault = false): Config[K] {
	const current = configHost.get();
	const value = current[key];

	if (value !== undefined || bypassDefault) {
		return value;
	}

	console.log("Missing config parameter:", key);
	const defaultValue = getDefaultValue(key);

	void setConfig(key, defaultValue);

	return defaultValue;
}

export function sync(): Config {
	return configHost.get();
}

export async function setConfig<K extends ConfigKey>(entry: K, value: Config[K]) {
	return configHost.set({ [entry]: value });
}

export async function setConfigBulk(toSet: Config) {
	return configHost.set(toSet);
}

export function getDefaultValue<K extends ConfigKey>(entry: K): Config[K] {
	return getDefaults()[entry] as Config[K];
}
