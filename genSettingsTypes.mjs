import fs from "fs";
import path from "path";

const settingsPath = path.join(import.meta.dirname, "assets", "settings.json");
const dtsPath = path.join(import.meta.dirname, "src", "configTypes.d.ts");

function generateType(settings) {
    const lines = [];
    lines.push("// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script");
    lines.push("export interface Config {");

    for (const category in settings) {
        const categorySettings = settings[category];

        for (const settingKey in categorySettings) {
            if (settingKey.startsWith("button-")) continue;

            const setting = categorySettings[settingKey];
            let type;
            if (setting["outputType"]) {
                type = setting["outputType"];
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

function inferType(inputType) {
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

export async function generateDTSFile() {
    const settings = JSON.parse(await fs.promises.readFile(settingsPath, "utf-8"));
    const dtsContent = generateType(settings);
    await fs.promises.writeFile(dtsPath, dtsContent, "utf-8");
    console.log(`Generated settings.d.ts at ${dtsPath}`);
}