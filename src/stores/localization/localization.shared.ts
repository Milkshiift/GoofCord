import { defineStore } from "electron-sync-store";

export const LocalizationStore = defineStore<Record<string, string>>({
    name: "localization",
    defaults: {},
});