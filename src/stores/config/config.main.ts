import fs from "node:fs";
import path from "node:path";
import { app, dialog, safeStorage, shell } from "electron";
import { createHost, type StoreHost } from "electron-sync-store/main";
import { type Config, type ConfigKey, getDefaults, isEncrypted } from "../../settingsSchema.ts";
import { getErrorMessage, getGoofCordFolderPath, tryCreateFolder } from "../../utils.ts";

// ============================================================================
// State & Initialization
// ============================================================================

export let firstLaunch = false;
let configHost: StoreHost<Config>;

export async function loadConfig(): Promise<void> {
	configHost = createHost<Config>("config", {
		onHydrate: hydrate,
		onPersist: saveToDisk,
	});
	await configHost.ready();
}

async function setup(): Promise<Config> {
	console.log("Setting up default GoofCord settings.");
	firstLaunch = true;
	const defaults = getDefaults();
	await saveToDisk(defaults);
	return defaults;
}

// ============================================================================
// Getters
// ============================================================================

export function getConfig<K extends ConfigKey>(key: K): Config[K] {
	return configHost.get()[key] ?? getDefaultValue(key);
}

export function getConfigRaw<K extends ConfigKey>(key: K): Config[K] | undefined {
	return configHost.get()[key];
}

export function getConfigBulk(): Config {
	return configHost.get();
}

export function getDefaultValue<K extends ConfigKey>(entry: K): Config[K] {
	return getDefaults()[entry] as Config[K];
}

// ============================================================================
// Setters
// ============================================================================

export async function setConfig<K extends ConfigKey>(key: K, value: Config[K]): Promise<void> {
	const current = configHost.get();
	await configHost.set({ ...current, [key]: value });
}

export async function setConfigBulk(config: Config): Promise<void> {
	await configHost.set(config);
}

// ============================================================================
// Maintenance
// ============================================================================

export async function cleanUpConfig(): Promise<void> {
	const currentConfig = configHost.get();
	const defaults = getDefaults();
	const validKeys = new Set(Object.keys(defaults));

	const cleanedConfig = { ...currentConfig };
	let hasChanges = false;
	let removedCount = 0;

	for (const key of Object.keys(cleanedConfig)) {
		if (!validKeys.has(key)) {
			// @ts-expect-error: Deleting a key that isn't in the type definition
			delete cleanedConfig[key];
			hasChanges = true;
			removedCount++;
			console.log(`[Config] Removed obsolete property: "${key}"`);
		}
	}

	if (hasChanges) {
		console.log(`[Config] Cleanup complete. Removed ${removedCount} obsolete keys.`);
		await configHost.set(cleanedConfig);
	}
}

// ============================================================================
// Private
// ============================================================================

async function hydrate(): Promise<Config> {
	safeStorage.setUsePlainTextEncryption(true);
	while (true) {
		try {
			// fs.promises.readFile is much slower than fs.readFileSync
			const rawData = fs.readFileSync(getConfigLocation(), "utf-8");
			return JSON.parse(rawData) as Config;
		} catch (e: unknown) {
			const result = await handleConfigError(e);
			if (result.data) return result.data;
			if (!result.retry) return getDefaults();
		}
	}
}

async function saveToDisk(state: Config) {
	// Safeguard for safeStorage.
	// This should only trigger on setup, where we don't mind the extra delay.
	await app.whenReady();

	try {
		for (const [key, value] of Object.entries(state)) {
			if (isEncrypted(key)) {
				// biome-ignore lint/suspicious/noExplicitAny: It's fine
				(state as any)[key as ConfigKey] = encryptSafeStorage(value);
			}
		}
		await fs.promises.writeFile(getConfigLocation(), JSON.stringify(state, null, 2), "utf-8");
	} catch (e: unknown) {
		console.error("Failed to save settings:", e);
		dialog.showErrorBox("GoofCord was unable to save the settings", getErrorMessage(e));
	}
}

export async function decryptSettings() {
	// Safeguard for safeStorage. Ideally the function should be called after init.
	await app.whenReady();

	const config = configHost.get();
	for (const [key, value] of Object.entries(config)) {
		if (isEncrypted(key)) {
			// biome-ignore lint/suspicious/noExplicitAny: It's fine
			(config as any)[key as ConfigKey] = decryptSafeStorage(value as string);
		}
	}
	await configHost.set(config, { persist: false });
}

export function encryptSafeStorage(plaintext: unknown) {
	const plaintextString = JSON.stringify(plaintext);
	return safeStorage.encryptString(plaintextString).toString("base64");
}

export function decryptSafeStorage(encryptedBase64: string) {
	return JSON.parse(safeStorage.decryptString(Buffer.from(encryptedBase64, "base64")));
}

async function handleConfigError(e: unknown): Promise<{ retry: boolean; data?: Config }> {
	if (e instanceof Error && "code" in e && e.code === "ENOENT") {
		tryCreateFolder(getGoofCordFolderPath());
		return { retry: false, data: await setup() };
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
		case 2: // Reset
			return { retry: false, data: await setup() };
		case 3: // Exit
			app.exit();
			throw new Error("Application exiting");
		default:
			return { retry: true };
	}
}

function getConfigLocation(): string {
	return path.join(getGoofCordFolderPath(), "settings.json");
}
