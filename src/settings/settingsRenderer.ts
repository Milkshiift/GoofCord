import { ipcRenderer } from "electron";
import type { Config, ConfigKey } from "../configTypes";
import { i } from "../modules/localization";
import { evaluateShowAfter } from "./preload";

const settingsSchema = require("../settingsSchema.cjs");
const config = ipcRenderer.sendSync("config:getConfigBulk");

export interface SettingEntry {
	name: ConfigKey;
	description: string;
	inputType: string;
	defaultValue: Config[ConfigKey];
	encrypted?: boolean;
	options?: string[];
	showAfter?: {
		key: string;
		condition: (value: unknown) => boolean;
	};
}

interface ButtonEntry {
	name: string;
	onClick: string;
}

export async function renderSettings() {
	const html = Object.keys(settingsSchema).map(makeCategory).join("");
	const settingsDiv = document.getElementById("settings");
	if (settingsDiv) settingsDiv.innerHTML = html;
}

let buttons: [string, ButtonEntry][] = [];
function makeCategory(name: string) {
	return `
        <h2>${i(`category-${name.toLowerCase().split(" ")[0]}`)}</h2>
        <form class='settingsContainer'>
            ${fillCategory(name)}
            <div class="buttonContainer"> 
				${buttons.map((button) => createButton(...(button as [string, ButtonEntry]))).join("")}
            </div>
        </form>
    `;
}

function fillCategory(categoryName: string) {
	buttons = [];
	return Object.entries(settingsSchema[categoryName])
		.map(([setting, entry]) => createField(setting, entry as SettingEntry | ButtonEntry))
		.filter(Boolean) // Removing falsy items
		.join("");
}

function createField(setting: string, entry: SettingEntry | ButtonEntry) {
	if (setting.startsWith("button-")) {
		buttons.push([setting, entry as ButtonEntry]);
		return null;
	}
	return createSetting(setting, entry as SettingEntry);
}

function createSetting(setting: string, entry: SettingEntry) {
	if (!entry.name) return "";

	let value = config[setting];
	if (entry.encrypted) {
		if (typeof value === "string") {
			value = ipcRenderer.sendSync("decryptSafeStorage", value);
		} else if (Array.isArray(value)) {
			value = value.map((value) => ipcRenderer.sendSync("decryptSafeStorage", value));
		}
	}
	const isHidden = entry.showAfter && !evaluateShowAfter(entry.showAfter.condition, config[entry.showAfter.key]);

	const name = i(`opt-${setting}`);
	const description = i(`opt-${setting}-desc`);

	return `
        <fieldset class="${isHidden ? "hidden" : ""}">
            <div class='checkbox-container'>
                <div id="revert-button" title="Revert to default value"></div>
                ${getInputElement(entry, setting, value)}
                <label for="${setting}">${name}</label>
            </div>
            <p class="description">${description}</p>
        </fieldset>
    `;
}

function createButton(setting: string, entry: ButtonEntry) {
	return `<button onclick="${entry.onClick}">${i(`opt-${setting}`)}</button>`;
}

function getInputElement<K extends ConfigKey>(entry: SettingEntry, setting: string, value: K) {
	switch (entry.inputType) {
		case "checkbox":
			return `<input setting-name="${setting}" id="${setting}" type="checkbox" ${value ? "checked" : ""}/>`;
		case "textfield":
			return `<input setting-name="${setting}" class="text" id="${setting}" type="text" value="${value}"/>`;
		case "textarea":
			return `<textarea setting-name="${setting}" >${Array.isArray(value) ? value.join(",\n") : value}</textarea>`;
		case "file":
			return `<input setting-name="${setting}" id="${setting}" type="file"/>`;
		case "dropdown":
		case "dropdown-multiselect":
			return `
                <select setting-name="${setting}" class="left dropdown" id="${setting}" name="${setting}" ${entry.inputType === "dropdown-multiselect" ? "multiple" : ""}>
                    ${entry.options
											?.map(
												(option) => `
                        <option value="${option}" ${option === value || (Array.isArray(value) && value.includes(option)) ? "selected" : ""}>
                            ${option}
                        </option>
                    `,
											)
											.join("")}
                </select>
            `;
		default:
			console.warn(`Unsupported input type: ${entry.inputType}`);
			return "";
	}
}
