import fs from "node:fs";
import path from "node:path";

const lang = "en-US";
const localization = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "lang", lang + ".json"), "utf-8"));
const defaultLang = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "lang", "en-US.json"), "utf-8"));

// Gets localized string. Shortened because it's used very often
export function i(key: string) {
    return localization[key] || defaultLang[key];
}