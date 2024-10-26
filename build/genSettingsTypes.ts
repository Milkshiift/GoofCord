import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settingsSchema } from "../src/settingsSchema.ts";

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

function generateSettingsMappings(settings: { [x: string]: any; }) {
	const lines: string[] = [];

	for (const category in settings) {
		const categorySettings = settings[category];
		for (const [key, setting] of Object.entries(categorySettings)) {
			if (!key.startsWith("button-")) {
				// @ts-ignore
				const type = setting.outputType ?? inferType(setting.inputType);
				lines.push(`    "${key}": ${type};`);
			}
		}
	}

	return lines;
}

function generateType(settings) {
	// Collect all valid setting keys
	const valueTypes: string[] = [];
	for (const category in settings) {
		const categorySettings = settings[category];
		for (const key in categorySettings) {
			if (!key.startsWith("button-")) {
				valueTypes.push(`"${key}"`);
			}
		}
	}

	const lines = [
		"// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script",
		"",
		`export type ConfigKey = ${valueTypes.join(" | ")};`,
		"",
		"export type ConfigValue<K extends ConfigKey> = K extends keyof {",
		...generateSettingsMappings(settings),
		"} ? {",
		...generateSettingsMappings(settings),
		"}[K] : never;",
		"",
		"export type Config = Map<ConfigKey, ConfigValue<ConfigKey>>;"
	];

	return lines.join("\n");
}

const dtsPath = path.join(dirname(), "..", "src", "configTypes.d.ts");

export async function generateDTSFile() {
	const dtsContent = generateType(settingsSchema);
	await fs.promises.writeFile(dtsPath, dtsContent, "utf-8");
}