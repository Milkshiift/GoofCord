import { getConfig } from "@root/src/stores/config/config.preload.ts";
import { i } from "@root/src/stores/localization/localization.preload.ts";
import { sendSync } from "../../../ipc/client.preload.ts";
import { type ButtonEntry, type Config, type ConfigKey, type InputTypeMap, isEditableSetting, type SettingEntry, settingsSchema } from "../../../settingsSchema.ts";
import { MultiselectDropdown } from "./uiMultiselectDropdown.ts";
import { Strategies, type Strategy } from "./uiStrategies.ts";
import { TabSwitcher } from "./uiSwitcher.ts";

const toId = (name: string) =>
	name
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");

export const fieldsetCache = new Map<ConfigKey, HTMLElement>();

export function evaluateShowAfter(condition: (value: unknown) => boolean, value: unknown): boolean {
	return condition(value);
}

export function decryptSetting<K extends ConfigKey>(value: Config[K]): Config[K] {
	if (typeof value === "string") return sendSync("utils:decryptSafeStorage", value) as Config[K];
	if (Array.isArray(value)) return value.map((v) => sendSync("utils:decryptSafeStorage", v as string)) as Config[K];
	return value;
}

export function getVisibilityMap(): Map<ConfigKey, ConfigKey[]> {
	const map = new Map<ConfigKey, ConfigKey[]>();
	for (const category of Object.values(settingsSchema)) {
		for (const [key, entry] of Object.entries(category)) {
			const settingEntry = entry as SettingEntry;
			if (!isEditableSetting(settingEntry) || !settingEntry.showAfter) continue;

			const controllerKey = settingEntry.showAfter.key as ConfigKey;
			const dependents = map.get(controllerKey) ?? [];
			dependents.push(key as ConfigKey);
			map.set(controllerKey, dependents);
		}
	}
	return map;
}

export async function renderSettings(): Promise<void> {
	const categories = Object.keys(settingsSchema) as Array<keyof typeof settingsSchema>;

	if (getConfig("disableSettingsAnimations")) {
		document.body.classList.add("disable-animations");
	}

	document.body.innerHTML = buildPageHTML(categories);

	new TabSwitcher().init();
	for (const s of document.querySelectorAll<HTMLSelectElement>("select[multiple]")) {
		new MultiselectDropdown(s);
	}

	fieldsetCache.clear();
	for (const el of document.querySelectorAll<HTMLElement>("fieldset[data-setting-key]")) {
		const key = el.getAttribute("data-setting-key") as ConfigKey;
		if (key) fieldsetCache.set(key, el);
	}
}

function buildPageHTML(categories: Array<keyof typeof settingsSchema>): string {
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
			const category = settingsSchema[name];
			let settingsHTML = "";
			let buttonsHTML = "";

			for (const [key, entry] of Object.entries(category)) {
				if (key.startsWith("button-")) {
					buttonsHTML += `<button type="button" onclick="${(entry as ButtonEntry).onClick}">${i(`opt-${key}`)}</button>`;
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
			</div>`;
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
		</div>`;
}

function buildSettingHTML(key: ConfigKey, entry: SettingEntry): string {
	let value = getConfig(key);
	if (entry.encrypted && typeof value === "string") value = decryptSetting(value);

	const isEditable = isEditableSetting(entry);
	const showAfterKey = entry.showAfter?.key as ConfigKey;
	let isHidden = false;

	if (!isEditable) {
		isHidden = true;
	} else if (entry.showAfter) {
		const controllerValue = getConfig(showAfterKey);
		isHidden = !evaluateShowAfter(entry.showAfter.condition, controllerValue);
	}

	const isOffset = entry.showAfter && showAfterKey !== key;
	const name = entry.name ? (i(`opt-${key}`) ?? key) : key;
	const description = i(`opt-${key}-desc`) ?? entry.description ?? "";

	const classes = [isHidden && "hidden", isOffset && "offset"].filter(Boolean).join(" ");

	const strategy = isEditable ? (Strategies[entry.inputType] as Strategy<typeof entry.inputType>) : Strategies.json;
	const typedValue = value as InputTypeMap[keyof InputTypeMap];

	const inputHTML = strategy.render(entry, key, typedValue);

	return `
		<fieldset class="${classes}" data-setting-key="${key}">
			<div class="checkbox-container">
				<div class="revert-button" title="Revert to default value"></div>
				${inputHTML}
				<label for="${key}">${name}</label>
			</div>
			<p class="description">${description}</p>
		</fieldset>`;
}
