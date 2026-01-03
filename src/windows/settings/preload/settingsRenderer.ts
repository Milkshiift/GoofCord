import { getConfig } from "@root/src/stores/config/config.preload.ts";
import { i } from "@root/src/stores/localization/localization.preload.ts";
import { sendSync } from "../../../ipc/client.preload.ts";
import {
	type ButtonEntry,
	type Config,
	type ConfigKey,
	type SettingEntry,
	settingsSchema
} from "../../../settingsSchema.ts";
import { decryptSetting, evaluateShowAfter } from "./preload.mts";
import { MultiselectDropdown } from "./uiMultiselectDropdown.ts";
import { TabSwitcher } from "./uiSwitcher.ts";

const escapeHTML = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const toId = (name: string) =>
	name
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");

export async function renderSettings(): Promise<void> {
	const categories = Object.keys(settingsSchema);

	if (getConfig("disableSettingsAnimations")) {
		document.body.classList.add("disable-animations");
	}

	document.body.innerHTML = buildPageHTML(categories);

	new TabSwitcher().init();
	for (const select of document.querySelectorAll<HTMLSelectElement>("select[multiple]")) {
		new MultiselectDropdown(select);
	}
}

function buildPageHTML(categories: string[]): string {
	const tabs = categories
		.map((name, index) => {
			const id = `panel-${toId(name)}`;
			const title = i(`category-${name.toLowerCase().split(" ")[0]}`);
			return `<button class="tab-item${index === 0 ? " active" : ""}" data-target="${id}">${title}</button>`;
		})
		.join("");

	const panels = categories
		.map((name, idx) => {
			const id = `panel-${toId(name)}`;
			const category = settingsSchema[name as keyof typeof settingsSchema];

			let settingsHTML = "";
			let buttonsHTML = "";

			for (const [key, entry] of Object.entries(category)) {
				if (key.startsWith("button-")) {
					buttonsHTML += buildButtonHTML(key, entry as ButtonEntry);
				} else {
					settingsHTML += buildSettingHTML(key as ConfigKey, entry as SettingEntry);
				}
			}

			return `
        <div id="${id}" class="content-panel${idx === 0 ? " active" : ""}">
          <form class="settingsContainer">
            ${settingsHTML}
            ${buttonsHTML ? `<div class="buttonContainer">${buttonsHTML}</div>` : ""}
          </form>
        </div>
      `;
		})
		.join("");

	const encryptionWarning = sendSync("utils:isEncryptionAvailable") ? "" : `<div class="message warning"><p>${i("settings-encryption-unavailable")}</p></div>`;

	return `
    <div class="settings-page-container">
      <header class="settings-header">
        <nav class="settings-tabs" aria-label="Settings Categories">${tabs}</nav>
      </header>
      ${encryptionWarning}
      <div class="settings-content">${panels}</div>
    </div>
  `;
}

function buildSettingHTML(key: ConfigKey, entry: SettingEntry): string {
	let value = getConfig(key);

	if (entry.encrypted && typeof value === "string") {
		value = decryptSetting(value);
	}

	const isHidden = !entry.name || (entry.showAfter && !evaluateShowAfter(entry.showAfter.condition, getConfig(entry.showAfter.key as ConfigKey)));

	const isOffset = entry.showAfter && entry.showAfter.key !== key;
	const name = i(`opt-${key}`) ?? key;
	const description = i(`opt-${key}-desc`) ?? "";

	const classes = [isHidden && "hidden", isOffset && "offset"].filter(Boolean).join(" ");

	return `
    <fieldset class="${classes}">
      <div class="checkbox-container">
        <div class="revert-button" title="Revert to default value"></div>
        ${buildInputHTML(entry, key, value)}
        <label for="${key}">${name}</label>
      </div>
      <p class="description">${description}</p>
    </fieldset>
  `;
}

function buildInputHTML<K extends ConfigKey>(entry: SettingEntry, key: K, value: Config[K]): string {
	const attr = `setting-name="${key}" id="${key}"`;

	if (!entry.name) {
		return `<input data-hidden="true" ${attr} class="text" type="text" value="${escapeHTML(JSON.stringify(value))}"/>`;
	}

	switch (entry.inputType) {
		case "checkbox":
			return `<input ${attr} type="checkbox" ${value ? "checked" : ""}/>`;

		case "textfield":
			return `<input ${attr} class="text" type="text" value="${escapeHTML(String(value))}"/>`;

		case "textarea": {
			const text = Array.isArray(value) ? value.join(",\n") : String(value);
			return `<textarea ${attr}>${escapeHTML(text)}</textarea>`;
		}

		case "file":
			return `<input ${attr} accept="${entry.accept || "*"}" type="file"/>`;

		case "dropdown":
		case "dropdown-multiselect": {
			const isMulti = entry.inputType === "dropdown-multiselect";
			const selected = new Set(Array.isArray(value) ? value.map(String) : [String(value)]);
			const options = Array.isArray(entry.options) ? entry.options : Object.keys(entry.options ?? {});

			const optionsHTML = options.map((opt) => `<option value="${opt}"${selected.has(String(opt)) ? " selected" : ""}>${opt}</option>`).join("");

			return `<select ${attr} class="left dropdown" name="${key}"${isMulti ? " multiple" : ""}>${optionsHTML}</select>`;
		}

		case "dictionary": {
			const dictValue = (value ?? {}) as Record<string, string>;
			const rows = Object.entries(dictValue)
				.map(([k, v]) => buildDictionaryRowHTML(k, v))
				.join("");

			const presets = (Array.isArray(entry.options) ? entry.options : []) as Array<string | [string, string]>;
			const presetsHTML = presets
				.map((opt) => {
					const [k, v] = Array.isArray(opt) ? opt : [opt, ""];
					return `<option value="${escapeHTML(k)}" data-val="${escapeHTML(v)}">${escapeHTML(k)}</option>`;
				})
				.join("");

			return `
        <div class="dictionary-container" ${attr}>
          <div class="dictionary-rows">${rows}</div>
          <div class="dictionary-controls">
            <select class="dictionary-preset-select">
              <option value="" disabled selected>${i("settings-dictionary-add")}</option>
              <option value="$$empty$$">${i("settings-dictionary-custom")}</option>
              ${presetsHTML}
            </select>
          </div>
        </div>
      `;
		}

		default:
			return "";
	}
}

export function buildDictionaryRowHTML(key = "", value = ""): string {
	return `
    <div class="dictionary-row">
      <input type="text" class="dict-key" placeholder="${i("settings-dictionary-key")}" value="${escapeHTML(key)}" />
      <input type="text" class="dict-value" placeholder="${i("settings-dictionary-value")}" value="${escapeHTML(value)}" />
      <button type="button" class="dictionary-remove-btn" title="Remove">✕</button>
    </div>
  `;
}

function buildButtonHTML(id: string, entry: ButtonEntry): string {
	return `<button type="button" onclick="${entry.onClick}">${i(`opt-${id}`)}</button>`;
}
