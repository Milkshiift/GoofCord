import { setConfig, whenConfigReady } from "@root/src/stores/config/config.preload.ts";
import { contextBridge, ipcRenderer } from "electron";
import { invoke, sendSync } from "../../../ipc/client.preload.ts";
import { type Config, type ConfigKey, getDefinition, type InputTypeMap, isEditableSetting } from "../../../settingsSchema.ts";
import { evaluateShowAfter, fieldsetCache, getVisibilityMap, renderSettings } from "./settingsRenderer.ts";
import { createDictionaryRow, createListRow, Strategies, type Strategy } from "./uiStrategies.ts";
import { whenLocalizationReady } from "@root/src/stores/localization/localization.preload.ts";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
	loadCloud: () => invoke("cloud:loadCloud"),
	deleteCloud: () => invoke("cloud:deleteCloud"),
	saveCloud: () => invoke("cloud:saveCloud"),
	openFolder: (folder: string) => invoke("settings:openFolder", folder),
	clearCache: () => invoke("cacheManager:clearCache"),
});

let dependencyMap: Map<ConfigKey, ConfigKey[]>;

const init = async () => {
	if (document.readyState === "loading") {
		await new Promise<void>((r) => document.addEventListener("DOMContentLoaded", () => r()));
	}

	await whenConfigReady();
	await whenLocalizationReady();
	await renderSettings();
	dependencyMap = getVisibilityMap();
	bindGlobalEvents();
};

function bindGlobalEvents(): void {
	const delegate = (event: string, selector: string, handler: (el: HTMLElement, e: Event) => void) => {
		document.addEventListener(event, (e) => {
			const target = (e.target as HTMLElement).closest<HTMLElement>(selector);
			if (target) handler(target, e);
		});
	};

	delegate("click", ".dictionary-remove-btn", (btn) => {
		const container = btn.closest<HTMLElement>(".dictionary-container");
		btn.closest(".dictionary-row")?.remove();
		if (container) void handleSave(container);
	});

	delegate("change", ".dictionary-preset-select", (select) => {
		if (select instanceof HTMLSelectElement) handleDictionaryPreset(select);
	});

	delegate("click", ".list-add-btn", (btn) => {
		const container = btn.closest<HTMLElement>(".dictionary-container");
		const rowsContainer = container?.querySelector(".dictionary-rows");
		if (rowsContainer) {
			rowsContainer.insertAdjacentHTML("beforeend", createListRow(""));
		}
	});

	delegate("click", ".revert-button", (btn) => {
		const input = btn.parentElement?.querySelector<HTMLElement>("[setting-name]");
		if (input) void handleRevert(input);
	});

	document.addEventListener("change", (e) => {
		const target = e.target as HTMLElement;

		if (target.classList.contains("dictionary-preset-select")) return;

		const settingEl = target.hasAttribute("setting-name") ? target : target.closest<HTMLElement>("[setting-name]");
		if (settingEl) void handleSave(settingEl);
	});
}

function handleDictionaryPreset(select: HTMLSelectElement): void {
	const container = select.closest<HTMLElement>(".dictionary-container");
	const rowsContainer = container?.querySelector(".dictionary-rows");
	if (!rowsContainer || !container) return;

	const option = select.selectedOptions[0];
	const key = select.value === "$$empty$$" ? "" : select.value;
	const value = option?.dataset.val ?? "";

	rowsContainer.insertAdjacentHTML("beforeend", createDictionaryRow(key, value));
	select.selectedIndex = 0;

	if (key) void handleSave(container);
}

async function handleSave(element: HTMLElement): Promise<void> {
	const key = element.getAttribute("setting-name") as ConfigKey;
	if (!key) return;

	const def = getDefinition(key);
	if (!def) return;

	const isEditable = isEditableSetting(def);

	try {
		const strategy = isEditable ? (Strategies[def.inputType] as Strategy<typeof def.inputType>) : Strategies.json;

		let value = await strategy.extract(element, key);

		if (isEditable && def.encrypted) {
			value = encryptSetting(value);
		}

		await setConfig(key, value as Config[ConfigKey]);

		if (dependencyMap.has(key)) updateDependentVisibility(key, value);
		void invoke("flashTitlebar", "#5865F2");

		if (isEditable && def.onChange) void ipcRenderer.invoke(def.onChange);
	} catch (err) {
		console.error(`Failed to save ${key}:`, err);
	}
}

async function handleRevert(element: HTMLElement): Promise<void> {
	const key = element.getAttribute("setting-name") as ConfigKey;
	if (!key) return;

	const def = getDefinition(key);
	if (!def || def.defaultValue === undefined) return;

	const isEditable = isEditableSetting(def);

	if (isEditable && def.inputType === "file") {
		await setConfig(key, def.defaultValue);
		(element as HTMLInputElement).value = "";
		void invoke("flashTitlebar", "#5865F2");
		return;
	}

	const strategy = isEditable ? (Strategies[def.inputType] as Strategy<typeof def.inputType>) : Strategies.json;

	strategy.setValue(element, def.defaultValue as InputTypeMap[keyof InputTypeMap]);

	await handleSave(element);
}

function updateDependentVisibility(changedKey: ConfigKey, newValue: unknown): void {
	const dependents = dependencyMap.get(changedKey);
	if (!dependents) return;

	for (const dependentKey of dependents) {
		const dependentData = getDefinition(dependentKey);
		if (!isEditableSetting(dependentData) || !dependentData.showAfter) continue;

		const fieldset = fieldsetCache.get(dependentKey);
		if (!fieldset) continue;

		const shouldShow = evaluateShowAfter(dependentData.showAfter.condition, newValue);
		fieldset.classList.toggle("hidden", !shouldShow);
	}
}

function encryptSetting<T>(value: T): T {
	if (typeof value === "string") return sendSync("utils:encryptSafeStorage", value) as T;
	if (Array.isArray(value)) return value.map((v) => sendSync("utils:encryptSafeStorage", v as string)) as T;
	return value;
}

init().catch(console.error);
