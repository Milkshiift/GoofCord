import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settingsSchema } from "../src/settingsSchema.ts";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

function generateType(settings: object) {
	const lines: string[] = [];
	lines.push("// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script");

	// Generate the value types for the Map
	const valueTypes: string[] = [];

	for (const category in settings) {
		const categorySettings = settings[category];

		for (const settingKey in categorySettings) {
			if (settingKey.startsWith("button-")) continue;

			const setting = categorySettings[settingKey];
			let type: string;
			if (setting.outputType) {
				type = setting.outputType;
			} else {
				type = inferType(setting.inputType);
			}
			valueTypes.push(`"${settingKey}"`);
		}
	}

	// Generate the Config type as a Map
	lines.push(`export type ConfigKey = ${valueTypes.join(" | ")};`);
	lines.push("");
	lines.push("export type ConfigValue<K extends ConfigKey> = K extends keyof {");

	// Generate the value type mappings
	for (const category in settings) {
		const categorySettings = settings[category];

		for (const settingKey in categorySettings) {
			if (settingKey.startsWith("button-")) continue;

			const setting = categorySettings[settingKey];
			let type: string;
			if (setting.outputType) {
				type = setting.outputType;
			} else {
				type = inferType(setting.inputType);
			}
			lines.push(`    "${settingKey}": ${type};`);
		}
	}

	lines.push("} ? {");

	// Repeat the mappings for the conditional type
	for (const category in settings) {
		const categorySettings = settings[category];

		for (const settingKey in categorySettings) {
			if (settingKey.startsWith("button-")) continue;

			const setting = categorySettings[settingKey];
			let type: string;
			if (setting.outputType) {
				type = setting.outputType;
			} else {
				type = inferType(setting.inputType);
			}
			lines.push(`    "${settingKey}": ${type};`);
		}
	}
	lines.push(`}[K] : never;`);

	// Define the Config type as a Map
	lines.push("\nexport type Config = Map<ConfigKey, ConfigValue<ConfigKey>>;");

	return lines.join("\n");
}

function inferType(inputType: string) {
	switch (inputType) {
		case "checkbox":
			return "boolean";
		case "textfield":
		case "dropdown":
		case "file":
			return "string";
		case "textarea":
		case "dropdown-multiselect":
			return "string[]";
		default:
			return "unknown";
	}
}

const dtsPath = path.join(dirname(), "..", "src", "configTypes.d.ts");

export async function generateDTSFile() {
	const dtsContent = generateType(settingsSchema);
	await fs.promises.writeFile(dtsPath, dtsContent, "utf-8");
}