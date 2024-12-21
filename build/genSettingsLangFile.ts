import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractKeysAtLevel, extractJSON } from "./cursedJson.ts";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

export async function genSettingsLangFile() {
	function extractNames(data: string) {
		const result = {};

		const categories = extractKeysAtLevel(data, 1);
		for (const category of categories) {
			result[`category-${category.toLowerCase().split(" ")[0]}`] = category;

			const settings = extractJSON(data, [category])!;
			const settingKeys = extractKeysAtLevel(settings, 1);
			for (const key of settingKeys) {
				const name = extractJSON(settings, [key, "name"]);
				const description = extractJSON(settings, [key, "description"]);
				if (name !== undefined) {
					result[`opt-${key}`] = name;
					if (description !== undefined) {
						result[`opt-${key}-desc`] = description;
					}
				}
			}
		}

		return result;
	}

	const file = (await fs.promises.readFile(path.join(dirname(), "..", "src", "settingsSchema.ts"), "utf-8")).split("settingsSchema = ").pop();
	if (!file) { console.error("Failed to read settingsSchema file"); return; }

	const extractedStrings = extractNames(file);

	const engLangPath = path.join(dirname(), "..", "assets", "lang", "en-US.json");
	const engLang = JSON.parse(await fs.promises.readFile(engLangPath, "utf8"));

	for (const key in extractedStrings) {
		if (key.startsWith("opt-")) delete engLang[key];
		engLang[key] = extractedStrings[key];
	}

	await fs.promises.writeFile(engLangPath, JSON.stringify(engLang, null, 2), "utf8");
}
