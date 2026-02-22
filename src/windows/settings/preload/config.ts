import { getConfig, setConfig } from "@root/src/stores/config/config.preload.ts";
import { ipcRenderer } from "electron";
import { invoke, sendSync } from "../../../ipc/client.preload.ts";
import type { Config, ConfigKey, SettingEntry } from "../../../settingsSchema.ts";

const listeners = new Map<string, Set<() => void>>();

export function subscribe(key: string, callback: () => void): () => void {
	if (!listeners.has(key)) listeners.set(key, new Set());
	listeners.get(key)?.add(callback);
	return () => listeners.get(key)?.delete(callback);
}

function notify(key: string): void {
	const callbacks = listeners.get(key);
	if (!callbacks) return;
	for (const cb of callbacks) {
		cb();
	}
}

export function isEncryptionAvailable(): boolean {
	return sendSync("utils:isEncryptionAvailable") as boolean;
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
