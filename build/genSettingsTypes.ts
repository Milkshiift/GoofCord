import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settingsSchema } from "../src/settingsSchema.ts";

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

function generateType(settings: object) {
	const lines: string[] = [];
	lines.push("// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script");
	lines.push("export interface Config {");

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

	lines.push("}");
	lines.push("\nexport type ConfigKey = keyof Config;");

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
