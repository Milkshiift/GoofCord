import path from "node:path";
import { extractKeysAtLevel, extractJSON } from "./cursedJson.ts";

// Simple mapping of input types to TypeScript types
const TYPE_MAPPING: Record<string, string> = {
	checkbox: "boolean",
	textfield: "string",
	dropdown: "string",
	file: "string",
	textarea: "string[]",
	"dropdown-multiselect": "string[]",
};

function inferType(inputType: string): string {
	return TYPE_MAPPING[inputType] ?? "unknown";
}

function generateSettingsMappings(data: string): string[] {
	const lines: string[] = [];

	const categories = extractKeysAtLevel(data, 1);
	for (const category of categories) {
		const settings = extractJSON(data, [category]);
		if (!settings) throw new Error(`Failed to extract JSON for category: ${category}`);
		const settingKeys = extractKeysAtLevel(settings, 1);
		for (const key of settingKeys) {
			if (key.startsWith("button-")) continue;
			const outputType = extractJSON(settings, [key, "outputType"]);
			const inputType = extractJSON(settings, [key, "inputType"]);
			const type = outputType ?? inferType(inputType ?? "unknown");
			lines.push(`    "${key}": ${type};`);
		}
	}

	return lines;
}

function generateType(data: string): string {
	const settingKeys: string[] = extractKeysAtLevel(data, 2)
		.filter((key) => !key.startsWith("button-"))
		.map((key) => `"${key}"`);
	const settingsMappings = generateSettingsMappings(data);
	const lines = [
		"// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script",
		"",
		`export type ConfigKey = ${settingKeys.join(" | ")};`,
		"",
		"export type ConfigValue<K extends ConfigKey> = K extends keyof {",
		...settingsMappings,
		"} ? {",
		...settingsMappings,
		"}[K] : never;",
		"",
		"export type Config = Map<ConfigKey, ConfigValue<ConfigKey>>;",
	];

	return lines.join("\n");
}

const dtsPath = path.join(import.meta.dir, "..", "src", "configTypes.d.ts");

export async function generateDTSFile(): Promise<void> {
	const fileContent = await Bun.file(path.join(import.meta.dir, "..", "src", "settingsSchema.ts")).text();
	const splitContent = fileContent.split("settingsSchema = ");
	if (splitContent.length < 2) throw new Error("Could not find settingsSchema assignment in file");
	const file = splitContent.pop();
	if (!file) throw new Error("settingsSchema content is empty");

	const dtsContent = generateType(file);
	await Bun.write(dtsPath, dtsContent);
}
