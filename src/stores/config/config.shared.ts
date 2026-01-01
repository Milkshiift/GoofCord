import { defineStore } from "electron-sync-store";
import { type Config, getDefaults } from "../../settingsSchema.ts";

export const AppConfigStore = defineStore<Config>({
    name: "config",
    defaults: getDefaults(),
    optimistic: true,
    validate: (data) => {
        if (!data || typeof data !== 'object') throw new Error("Invalid config format");
        return { ...getDefaults(), ...data } as Config;
    }
});