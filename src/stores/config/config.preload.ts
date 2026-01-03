import { createClient, type StoreClient } from "electron-sync-store/preload";
import { type Config, type ConfigKey, getDefaults } from "../../settingsSchema";

const configClient: StoreClient<Config> = createClient("config");

export const whenConfigReady = () => configClient.ready();

export function getConfig<K extends ConfigKey>(key: K): Config[K] {
	return configClient.get()[key] ?? getDefaults()[key];
}

export function getConfigBulk(): Config {
	return configClient.get();
}

export async function setConfig<K extends ConfigKey>(key: K, value: Config[K]): Promise<void> {
	const current = configClient.get();
	await configClient.set({ ...current, [key]: value });
}

export function subscribeToConfig(cb: (config: Config) => void) {
	return configClient.subscribe(cb);
}
