import fs from "node:fs";
import path from "node:path";
import { app, ipcMain, ipcRenderer } from "electron";
import { cachedConfig, setConfig } from "../config";

let localization: object;
let defaultLang: object;
if (process.type === "browser") {
	ipcMain.on("localization:getObjects", (event) => {
		event.returnValue = [localization, defaultLang];
	});
} else {
	[localization, defaultLang] = ipcRenderer.sendSync("localization:getObjects");
}

export async function initLocalization() {
	let lang = cachedConfig.locale;
	if (!lang) {
		const possibleLocales = fs.readdirSync("assets/lang").map((file) => file.replace(".json", ""));
		await app.whenReady();
		lang = app.getPreferredSystemLanguages()[0];
		if (!possibleLocales.includes(lang)) lang = "en-US";
		void setConfig("locale", lang);
	}
	localization = JSON.parse(fs.readFileSync(path.join(__dirname, "assets", "lang", lang + ".json"), "utf-8"));
	defaultLang = JSON.parse(fs.readFileSync(path.join(__dirname, "assets", "lang", "en-US.json"), "utf-8"));
}

// Gets localized string. Shortened because it's used very often
export function i(key: string) {
	const translated = localization[key];
	if (translated !== undefined) return translated;
	return defaultLang[key];
}
