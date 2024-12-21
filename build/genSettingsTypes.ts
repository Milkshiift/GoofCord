import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractKeysAtLevel, extractJSON } from "./cursedJson.ts";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

// Simple mapping of input types to TypeScript types
const TYPE_MAPPING = {
	checkbox: "boolean",
	textfield: "string",
	dropdown: "string",
	file: "string",
	textarea: "string[]",
	"dropdown-multiselect": "string[]"
};

function inferType(inputType: string) {
	return TYPE_MAPPING[inputType] ?? "unknown";
}

function generateSettingsMappings(data: string) {
	const lines: string[] = [];

	const categories = extractKeysAtLevel(data, 1);
	for (const category of categories) {
		const settings = extractJSON(data, [category])!;
		const settingKeys = extractKeysAtLevel(settings, 1);
		for (const key of settingKeys) {
			if (key.startsWith("button-")) continue;
			const type = extractJSON(settings, [key, "outputType"]) ?? inferType(extractJSON(settings, [key, "inputType"])!);
			lines.push(`    "${key}": ${type};`);
		}
	}

	return lines;
}

function generateType(data: string) {
	const settingKeys: string[] = extractKeysAtLevel(data, 2).filter(key => !key.startsWith("button-")).map(key => `"${key}"`);
	const lines = [
		"// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script",
		"",
		`export type ConfigKey = ${settingKeys.join(" | ")};`,
		"",
		"export type ConfigValue<K extends ConfigKey> = K extends keyof {",
		...generateSettingsMappings(data),
		"} ? {",
		...generateSettingsMappings(data),
		"}[K] : never;",
		"",
		"export type Config = Map<ConfigKey, ConfigValue<ConfigKey>>;"
	];

	return lines.join("\n");
}

const dtsPath = path.join(dirname(), "..", "src", "configTypes.d.ts");

export async function generateDTSFile() {
	const file = (await fs.promises.readFile(path.join(dirname(), "..", "src", "settingsSchema.ts"), "utf-8")).split("settingsSchema = ").pop()!;
	const dtsContent = generateType(file);
	await fs.promises.writeFile(dtsPath, dtsContent, "utf-8");
}