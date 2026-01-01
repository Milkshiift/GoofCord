// @ts-expect-error See /build/globbyGlob.ts
import allLangData from "glob-import:../../../assets/lang/*.json";
import { LocalizationStore } from "@root/src/stores/localization/localization.shared.ts";
import { app } from "electron";
import { createHost, type StoreHost } from "electron-sync-store/main";
import { getConfig, setConfig } from "../config/config.main.ts";

const TranslationLogic = {
	onHydrate: async () => {
		let lang = getConfig("locale", true);
		if (!lang) {
			const possibleLocales = Object.keys(allLangData);
			await app.whenReady();
			lang = app.getPreferredSystemLanguages()[0];
			if (!possibleLocales.includes(lang)) lang = "en-US";
			await setConfig("locale", lang);
		}
		return bakeLocalization(lang);
	}
};

let locHost: StoreHost<Record<string, string>> | undefined;

function bakeLocalization(lang: string): Record<string, string> {
	const active = allLangData[lang] || {};
	const fallback = allLangData["en-US"] || {};
	return { ...fallback, ...active };
}

export async function initLocalization() {
	locHost = undefined;
	locHost = createHost(LocalizationStore, TranslationLogic);
	await locHost.ready();
}

export function i(key: string): string {
	return locHost?.get()[key] || key;
}

export function sync() {
	return locHost?.get();
}