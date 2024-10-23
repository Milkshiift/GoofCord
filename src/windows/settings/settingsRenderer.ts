import { ipcRenderer } from "electron";
import type { ConfigKey } from "../../configTypes.d.ts";
import { type ButtonEntry, type SettingEntry, settingsSchema } from "../../settingsSchema.ts";
import { evaluateShowAfter } from "./preload.mts";

const config = ipcRenderer.sendSync("config:getConfigBulk");

export async function renderSettings() {
	const html = Object.keys(settingsSchema).map(makeCategory).join("");
	const settingsDiv = document.getElementById("settings");
	if (settingsDiv) settingsDiv.innerHTML = html;
}

let buttons: [string, ButtonEntry][] = [];
function makeCategory(name: string) {
	return `
        <h2>${ipcRenderer.sendSync("localization:i", `category-${name.toLowerCase().split(" ")[0]}`)}</h2>
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
			value = ipcRenderer.sendSync("utils:decryptSafeStorage", value);
		} else if (Array.isArray(value)) {
			value = value.map((element) => ipcRenderer.sendSync("utils:decryptSafeStorage", element));
		}
	}
	const isHidden = entry.showAfter && !evaluateShowAfter(entry.showAfter.condition, config[entry.showAfter.key]);

	const name = ipcRenderer.sendSync("localization:i", `opt-${setting}`);
	const description = ipcRenderer.sendSync("localization:i", `opt-${setting}-desc`);

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
	return `<button onclick="${entry.onClick}">${ipcRenderer.sendSync("localization:i", `opt-${setting}`)}</button>`;
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
			return `<input setting-name="${setting}" id="${setting}" accept="${entry.accept}" type="file"/>`;
		case "dropdown":
		case "dropdown-multiselect":
			return `
                <select setting-name="${setting}" class="left dropdown" id="${setting}" name="${setting}" ${entry.inputType === "dropdown-multiselect" ? "multiple" : ""}>
                    ${entry.options // Silly biome formater 🤪
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
