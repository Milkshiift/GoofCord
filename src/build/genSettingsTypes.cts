const fs = require("node:fs");
const path = require("node:path");
const settingsSchema = require("../settingsSchema.cts");

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

const dtsPath = path.join(__dirname, "..", "configTypes.d.ts");

async function generateDTSFile() {
	const dtsContent = generateType(settingsSchema);
	await fs.promises.writeFile(dtsPath, dtsContent, "utf-8");
	console.log(`Generated settings.d.ts at ${dtsPath}`);
}

module.exports = generateDTSFile;
