// @ts-expect-error See /build/globbyGlob.ts
import allLangData from "glob-import:../../assets/lang/*.json";
import { app } from "electron";
import { getConfig, setConfig } from "../config.ts";

let localization: object;
let defaultLang: object;

export async function initLocalization() {
	let lang = getConfig("locale", true);
	if (!lang) {
		const possibleLocales = Object.keys(allLangData);
		await app.whenReady();
		lang = app.getPreferredSystemLanguages()[0];
		if (!possibleLocales.includes(lang)) lang = "en-US";
		void setConfig("locale", lang);
	}
	localization = allLangData[lang];
	defaultLang = allLangData["en-US"];
}

// Gets localized string. Shortened because it's used very often
export function i<IPCOn>(key: string) {
	const translated = (localization as Record<string, string>)[key];
	if (translated !== undefined) return translated;
	return (defaultLang as Record<string, string>)[key];
}
