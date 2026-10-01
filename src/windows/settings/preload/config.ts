import { getConfig, setConfig } from "@root/src/stores/config/config.preload.ts";
import { ipcRenderer } from "electron";

import { invoke, sendSync } from "../../../ipc/client.preload.ts";
import type { Config, ConfigKey, SettingEntry } from "../../../settingsSchema.ts";

const listeners = new Map<string, Set<() => void>>();

export function subscribe(key: string, callback: () => void): () => void {
	let keyListeners = listeners.get(key);
	if (!keyListeners) {
		keyListeners = new Set();
		listeners.set(key, keyListeners);
	}
	keyListeners.add(callback);

	return () => {
		const current = listeners.get(key);
		if (current) {
			current.delete(callback);
			if (current.size === 0) {
				listeners.delete(key);
			}
		}
	};
}

function notify(key: string): void {
	const callbacks = listeners.get(key);
	if (!callbacks || callbacks.size === 0) return;

	for (const cb of callbacks) {
		cb();
	}
}

export function isEncryptionAvailable(): boolean {
	return Boolean(sendSync("utils:isEncryptionAvailable"));
}

export async function saveSetting(key: ConfigKey, value: unknown, entry: SettingEntry | null): Promise<void> {
	await setConfig(key, value as Config[ConfigKey]);
	notify(key);

	void invoke("flashTitlebar", "#5865F2");

	if (entry?.onChange) {
		void ipcRenderer.invoke(entry.onChange);
	}
}

export { getConfig };
