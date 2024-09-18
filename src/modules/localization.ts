import fs from "node:fs";
import path from "node:path";
import { ipcMain, ipcRenderer } from "electron";

const lang = "en-US";
let localization: object;
let defaultLang: object;
if (process.type === "browser") {
	localization = JSON.parse(fs.readFileSync(path.join(__dirname, "assets", "lang", lang + ".json"), "utf-8"));
	defaultLang = JSON.parse(fs.readFileSync(path.join(__dirname, "assets", "lang", "en-US.json"), "utf-8"));
	ipcMain.on("localization:getObjects", (event) => {
		event.returnValue = [localization, defaultLang];
	});
} else {
	[localization, defaultLang] = ipcRenderer.sendSync("localization:getObjects");
}

// Gets localized string. Shortened because it's used very often
export function i(key: string) {
	const translated = localization[key];
	if (translated !== undefined) return translated;
	return defaultLang[key];
}
