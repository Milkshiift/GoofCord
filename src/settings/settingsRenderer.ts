import fs from "node:fs";
import path from "node:path";
import {ipcRenderer} from "electron";
import {evaluateShowAfter} from "./preload";
import {i} from "../modules/localization";
import type {ConfigKey} from "../configTypes";

const settingsPath = path.join(__dirname, "../", "/assets/settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
const config = ipcRenderer.sendSync("config:getConfigBulk");

interface SettingEntry {
	name: string;
	description: string;
	inputType: string;
	options?: string[];
	showAfter?: {
		key: string;
		value: string;
	};
}

interface ButtonEntry {
	name: string;
	onClick: string;
}

export async function renderSettings() {
	const html = Object.keys(settings).map(makeCategory).join("");
	const settingsDiv = document.getElementById("settings");
	if (settingsDiv) settingsDiv.innerHTML = html
}

function makeCategory(name: string) {
	return `
        <h2>${i(`category-${name.toLowerCase().split(" ")[0]}`)}</h2>
        <form class='settingsContainer'>
            ${fillCategory(name)}
        </form>
    `;
}

function fillCategory(categoryName: string) {
	return Object.entries(settings[categoryName])
		.map(([setting, entry]) => createField(setting, entry as SettingEntry | ButtonEntry))
		.filter(Boolean) // Removing falsy items
		.join("");
}

function createField(setting: string, entry: SettingEntry | ButtonEntry) {
	if (setting.startsWith("button-")) return createButton(setting, entry as ButtonEntry);
	return createSetting(setting, entry as SettingEntry);
}

function createSetting(setting: string, entry: SettingEntry) {
	if (!entry.name) return "";

	const value = setting === "encryptionPasswords" ? ipcRenderer.sendSync("messageEncryption:getDecryptedPasswords") : config[setting];

	const showAfter = entry.showAfter ? `${entry.showAfter.key}$${entry.showAfter.value}` : "";
	const isHidden = entry.showAfter && !evaluateShowAfter(entry.showAfter.value, config[entry.showAfter.key]);

	const name = i(`opt-${setting}`);
	const description = i(`opt-${setting}-desc`);

	return `
        <fieldset class="${isHidden ? "hidden" : ""}">
            <div class='checkbox-container'>
                <div id="revert-button" title="Revert to default value"></div>
                ${getInputElement(entry, setting, value, showAfter)}
                <label for="${setting}">${name}</label>
            </div>
            <p class="description">${description}</p>
        </fieldset>
    `;
}

function createButton(setting: string, entry: ButtonEntry) {
	return `<button onclick="${entry.onClick}">${i(`opt-${setting}`)}</button>`;
}

function getInputElement<K extends ConfigKey>(entry: SettingEntry, setting: string, value: K, showAfter: string) {
	switch (entry.inputType) {
		case "checkbox":
			return `<input setting-name="${setting}" show-after="${showAfter}" id="${setting}" type="checkbox" ${value ? "checked" : ""}/>`;
		case "textfield":
			return `<input setting-name="${setting}" show-after="${showAfter}" class="text" id="${setting}" type="text" value="${value}"/>`;
		case "textarea":
			return `<textarea setting-name="${setting}" show-after="${showAfter}">${Array.isArray(value) ? value.join(",\n") : value}</textarea>`;
		case "file":
			return `<input setting-name="${setting}" show-after="${showAfter}" id="${setting}" type="file"/>`;
		case "dropdown":
		case "dropdown-multiselect":
			return `
                <select setting-name="${setting}" show-after="${showAfter}" class="left dropdown" id="${setting}" name="${setting}" ${entry.inputType === "dropdown-multiselect" ? "multiple" : ""}>
                    ${entry.options?.map((option) => `
                        <option value="${option}" ${option === value || (Array.isArray(value) && value.includes(option)) ? "selected" : ""}>
                            ${option}
                        </option>
                    `,).join("")}
                </select>
            `;
		default:
			console.warn(`Unsupported input type: ${entry.inputType}`);
			return "";
	}
}
