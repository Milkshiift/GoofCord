import { invoke, sendSync } from "@root/src/ipc/client.preload.ts";
import { createHydrator } from "./modules/hydrator";
import type { Config, ConfigKey, ConfigValue } from "./settingsSchema";

const configState = createHydrator<Config>("config");

export function getConfig<K extends ConfigKey>(key: K, bypassDefault = false): ConfigValue<K> {
	const map = configState.get();
	const value = map.get(key);

	if (value !== undefined || bypassDefault) {
		return value as ConfigValue<K>;
	}

	const defaultValue = sendSync("config:getDefaultValue", key) as ConfigValue<K>;
	void setConfig(key, defaultValue);

	return map.get(key) as ConfigValue<K>;
}

export function getConfigBulk(): Config {
	return configState.get();
}

export async function setConfig<K extends ConfigKey>(key: K, value: ConfigValue<K>): Promise<void> {
	const current = configState.get();
	current.set(key, value);
	configState.forceSet(current);

	await invoke("config:setConfig", key, value);
}
