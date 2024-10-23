import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settingsSchema } from "../src/settingsSchema.ts";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

export async function genSettingsLangFile() {
	function extractNames(data: object) {
		const result = {};

		// Iterate through each category in the JSON object
		for (const category in data) {
			result[`category-${category.toLowerCase().split(" ")[0]}`] = category;
			const categorySettings = data[category];
			for (const setting in categorySettings) {
				if (categorySettings[setting].name === undefined) continue;
				result[`opt-${setting}`] = categorySettings[setting].name;
				if (categorySettings[setting].description === undefined) continue;
				result[`opt-${setting}-desc`] = categorySettings[setting].description;
			}
		}

		return result;
	}

	const extractedStrings = extractNames(settingsSchema);

	const engLangPath = path.join(dirname(), "..", "assets", "lang", "en-US.json");
	const engLang = JSON.parse(await fs.promises.readFile(engLangPath, "utf8"));

	for (const key in extractedStrings) {
		if (key.startsWith("opt-")) delete engLang[key];
		engLang[key] = extractedStrings[key];
	}

	await fs.promises.writeFile(engLangPath, JSON.stringify(engLang, null, 2), "utf8");
}
