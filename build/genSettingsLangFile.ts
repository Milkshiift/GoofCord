import path from "node:path";
import { extractKeysAtLevel, extractJSON } from "./cursedJson.ts";

export async function genSettingsLangFile() {
	interface LangEntries {
		[key: string]: string;
	}

	function extractNames(data: string): LangEntries {
		const result: LangEntries = {};

		const categories = extractKeysAtLevel(data, 1);
		for (const category of categories) {
			result[`category-${category.toLowerCase().split(" ")[0]}`] = category;

			const settings = extractJSON(data, [category]);
			if (!settings) throw new Error(`Failed to extract JSON for category: ${category}`);

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

	const settingsSchemaPath = path.join(import.meta.dir, "..", "src", "settingsSchema.ts");
	const settingsSchemaFile = Bun.file(settingsSchemaPath);
	const fileContent = await settingsSchemaFile.text();
	const file = fileContent.split("settingsSchema = ").pop();
	if (!file) {
		console.error("Failed to read settingsSchema file");
		return;
	}

	const extractedStrings = extractNames(file);

	const engLangPath = path.join(import.meta.dir, "..", "assets", "lang", "en-US.json");
	const engLangFile = Bun.file(engLangPath);
	const engLang = JSON.parse(await engLangFile.text());

	for (const key in extractedStrings) {
		if (key.startsWith("opt-")) {
			delete engLang[key];
		}
		engLang[key] = extractedStrings[key];
	}

	await Bun.write(engLangPath, JSON.stringify(engLang, null, 2));
}
