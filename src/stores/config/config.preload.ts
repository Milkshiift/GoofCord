import { createClient } from "electron-sync-store/preload";
import { type Config, type ConfigKey, type ConfigValue, getDefaults } from "../../settingsSchema";
import { AppConfigStore } from "./config.shared";

const configClient = createClient(AppConfigStore);

export const whenConfigReady = () => configClient.ready();

export function getConfig<K extends ConfigKey>(key: K, bypassDefault = false): ConfigValue<K> {
    const state = configClient.get();
    const value = state[key];

    if (value !== undefined || bypassDefault) {
        return value as ConfigValue<K>;
    }

    const defaultValue = getDefaults()[key] as ConfigValue<K>;

    void setConfig(key, defaultValue);

    return defaultValue;
}

export function getConfigBulk(): Config {
    return configClient.get();
}

export async function setConfig<K extends ConfigKey>(key: K, value: ConfigValue<K>): Promise<void> {
    await configClient.setKey(key, value as Config[K]);
}

export function subscribeToConfig(cb: (newConfig: Config) => void) {
    return configClient.subscribe(cb);
}