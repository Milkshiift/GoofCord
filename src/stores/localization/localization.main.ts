// @ts-expect-error See /build/globbyGlob.ts
import allLangData from "glob-import:../../../assets/lang/*.json";
import { app } from "electron";
import { createHost, type StoreHost } from "electron-sync-store/main";
import { getConfig, setConfig } from "../config/config.main.ts";

function bakeLocalization(lang: string): Record<string, string> {
	return { ...(allLangData["en-US"] || {}), ...(allLangData[lang] || {}) };
}

const TranslationLogic = {
	onHydrate: async (): Promise<Record<string, string>> => {
		let lang = getConfig("locale");
		if (!lang) {
			await app.whenReady();
			lang = app.getPreferredSystemLanguages()[0];
			if (!Object.keys(allLangData).includes(lang)) lang = "en-US";
			await setConfig("locale", lang);
		}
		return bakeLocalization(lang);
	},
};

let locHost: StoreHost<Record<string, string>>;

export async function initLocalization(): Promise<void> {
	locHost = createHost<Record<string, string>>("localization", TranslationLogic);
	await locHost.ready();
}

export function i(key: string): string {
	return locHost.get()[key] ?? key;
}
