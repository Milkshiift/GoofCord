// @ts-expect-error See /build/globbyGlob.ts
import allLangData from "glob-import:../../../assets/lang/*.json";
import { app, BrowserWindow } from "electron";
import { getConfig, setConfig } from "../../config";

let translations: Record<string, string>;

function bakeLocalization(lang: string) {
	const active = allLangData[lang] || {};
	const fallback = allLangData["en-US"] || {};

	translations = { ...fallback, ...active };
}

export async function initLocalization() {
	let lang = getConfig("locale", true);

	if (!lang) {
		const possibleLocales = Object.keys(allLangData);
		await app.whenReady();
		lang = app.getPreferredSystemLanguages()[0];
		if (!possibleLocales.includes(lang)) lang = "en-US";
		void setConfig("locale", lang);
	}

	bakeLocalization(lang);

	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send("localization:update", translations);
	}
}

export function i(key: string): string {
	return translations[key] || key;
}

export function sync<IPCOn>() {
	return translations;
}
