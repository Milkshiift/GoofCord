import fs from "node:fs";
import path from "node:path";

import { app, dialog, safeStorage, shell } from "electron";
import { createHost, type StoreHost } from "electron-sync-store/main";
import pc from "picocolors";

import { type Config, type ConfigKey, getDefaults, isEncrypted } from "../../settingsSchema.ts";
import { getErrorMessage, getGoofCordFolderPath, tryCreateFolder } from "../../utils.ts";

const LOG_PREFIX = pc.yellowBright("[Config]");

// ─── State & Initialization ─────────────────────────────────────────────

export let firstLaunch = false;
let configHost: StoreHost<Config>;
let _encryptionAvailable: boolean | undefined = undefined;

export async function initConfigEncryption(): Promise<boolean> {
	if (_encryptionAvailable !== undefined) return _encryptionAvailable;

	await app.whenReady();

	_encryptionAvailable = safeStorage.isEncryptionAvailable();

	if (!_encryptionAvailable && firstLaunch) {
		await dialog.showMessageBox({
			type: "warning",
			title: "Secure storage unavailable",
			message: "Some sensitive settings (e.g. message encryption passwords) will be stored in plaintext.\n" + (process.platform === "linux" ? "Install and start gnome-keyring or kwallet, then restart the app." : "This is unusual on Windows/macOS — please report the issue."),
			detail: `Backend: ${safeStorage.getSelectedStorageBackend() || "unknown"}`,
		});
	}

	if (_encryptionAvailable && process.platform === "linux") {
		console.log(LOG_PREFIX, `Secure backend: ${safeStorage.getSelectedStorageBackend()}`);
	} else if (!_encryptionAvailable) {
		console.warn(LOG_PREFIX, "safeStorage encryption unavailable — using plaintext fallback");
	}

	return _encryptionAvailable;
}

export async function loadConfig(): Promise<void> {
	configHost = createHost<Config>("config", {
		onHydrate: hydrate,
		onPersist: saveToDisk,
	});
	await configHost.ready();
}

async function setup(): Promise<Config> {
	console.log(LOG_PREFIX, "Setting up default GoofCord settings.");
	firstLaunch = true;
	const defaults = getDefaults();
	await saveToDisk(defaults);
	return defaults;
}

// ─── Getters ─────────────────────────────────────────────

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

// ─── Setters ─────────────────────────────────────────────

export async function setConfig<K extends ConfigKey>(key: K, value: Config[K]): Promise<void> {
	const current = configHost.get();
	await configHost.set({ ...current, [key]: value });
}

export async function setConfigBulk(config: Config): Promise<void> {
	await configHost.set(config);
}

// ─── Maintenance ─────────────────────────────────────────────

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
			console.log(LOG_PREFIX, `Removed obsolete property: "${key}"`);
		}
	}

	if (hasChanges) {
		console.log(LOG_PREFIX, `Cleanup complete. Removed ${removedCount} obsolete keys.`);
		await configHost.set(cleanedConfig);
	}
}

// ─── Private ─────────────────────────────────────────────

async function hydrate(): Promise<Config> {
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
				// state is a copy, so we can just write to it
				(state as any)[key as ConfigKey] = encryptSafeStorage(value);
			}
		}
		await fs.promises.writeFile(getConfigLocation(), JSON.stringify(state, null, 2), "utf-8");
	} catch (e: unknown) {
		console.error(LOG_PREFIX, "Failed to save settings:", e);
		dialog.showErrorBox("GoofCord was unable to save the settings", getErrorMessage(e));
	}
}

export async function decryptSettings() {
	// Safeguard for safeStorage. Ideally the function should be called after init.
	await app.whenReady();

	const config = configHost.get();
	for (const [key, value] of Object.entries(config)) {
		if (isEncrypted(key)) {
			try {
				(config as any)[key as ConfigKey] = decryptSafeStorage(value as string);
			} catch (e) {
				(config as any)[key as ConfigKey] = getDefaultValue(key as ConfigKey);
			}
		}
	}
	await configHost.set(config, { persist: false });
}

export function encryptSafeStorage(plaintext: unknown): string {
	const json = JSON.stringify(plaintext);

	if (!_encryptionAvailable && _encryptionAvailable !== undefined) {
		return `PLAIN:${json}`;
	}

	try {
		const buf = safeStorage.encryptString(json);
		return `ENC:${buf.toString("base64")}`;
	} catch (err) {
		console.error(LOG_PREFIX, "encryptSafeStorage failed:", err);
		_encryptionAvailable = false;
		return `PLAIN:${json}`;
	}
}

export function decryptSafeStorage(stored: string): any {
	if (stored.startsWith("PLAIN:")) {
		return JSON.parse(stored.slice(6));
	}

	if (stored.startsWith("ENC:")) {
		const base64 = stored.slice(4);
		try {
			const buf = Buffer.from(base64, "base64");
			const decrypted = safeStorage.decryptString(buf);
			return JSON.parse(decrypted);
		} catch (err) {
			console.error(LOG_PREFIX, "decryptSafeStorage failed:", err);
			throw new Error(`Cannot decrypt protected setting: ${getErrorMessage(err)}`);
		}
	}

	throw new Error(`Unknown storage prefix: ${stored.slice(0, 10)}…`);
}

async function handleConfigError(e: unknown): Promise<{ retry: boolean; data?: Config }> {
	if (e instanceof Error && "code" in e && e.code === "ENOENT") {
		tryCreateFolder(getGoofCordFolderPath());
		return { retry: false, data: await setup() };
	}

	console.error(LOG_PREFIX, "Failed to load the config:", e);
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
