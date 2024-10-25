import fs from "node:fs";
import { app } from "electron";
import { getConfig, setConfig } from "../config.ts";
import { getAsset } from "../utils.ts";

let localization: object;
let defaultLang: object;

export async function initLocalization() {
	let lang = getConfig("locale", true);
	if (!lang) {
		const possibleLocales = fs.readdirSync(getAsset("lang")).map((file) => file.replace(".json", ""));
		await app.whenReady();
		lang = app.getPreferredSystemLanguages()[0];
		if (!possibleLocales.includes(lang)) lang = "en-US";
		void setConfig("locale", lang);
	}
	localization = JSON.parse(fs.readFileSync(getAsset("lang/" + lang + ".json"), "utf-8"));
	defaultLang = JSON.parse(fs.readFileSync(getAsset("lang/en-US.json"), "utf-8"));
}

// Gets localized string. Shortened because it's used very often
export function i<IPCOn>(key: string) {
	const translated = localization[key];
	if (translated !== undefined) return translated;
	return defaultLang[key];
}
