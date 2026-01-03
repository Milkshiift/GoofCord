import { setConfig } from "@root/src/stores/config/config.preload.ts";
import { contextBridge, ipcRenderer } from "electron";
import { invoke, sendSync } from "../../../ipc/client.preload.ts";
import { Config, ConfigKey, getDefinition, isEditableSetting, } from "../../../settingsSchema.ts";
import { buildDictionaryRowHTML, renderSettings } from "./settingsRenderer.ts";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
	loadCloud: () => invoke("cloud:loadCloud"),
	deleteCloud: () => invoke("cloud:deleteCloud"),
	saveCloud: () => invoke("cloud:saveCloud"),
	openFolder: (folder: string) => invoke("settings:openFolder", folder),
	clearCache: () => invoke("cacheManager:clearCache"),
});

const dependentElements = new Map<string, HTMLElement[]>(); // key: controlling setting, value: dependent elements

async function init(): Promise<void> {
	if (document.readyState === "loading") {
		await new Promise<void>((resolve) => {
			document.addEventListener("DOMContentLoaded", () => resolve());
		});
	}

	await renderSettings();
	bindSettingsElements();
	bindGlobalEvents();
}

function bindSettingsElements(): void {
	for (const element of document.querySelectorAll<HTMLElement>("[setting-name]")) {
		element.addEventListener("change", () => handleSave(element));
		element.parentElement?.querySelector(".revert-button")?.addEventListener("click", () => handleRevert(element));
	}
}

function bindGlobalEvents(): void {
	document.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;

		if (target.classList.contains("dictionary-remove-btn")) {
			const container = target.closest<HTMLElement>(".dictionary-container");
			target.closest(".dictionary-row")?.remove();
			if (container) void handleSave(container);
		}
	});

	document.addEventListener("change", (e) => {
		const target = e.target as HTMLSelectElement;
		if (!target.classList.contains("dictionary-preset-select")) return;

		const container = target.closest<HTMLElement>(".dictionary-container");
		const rowsContainer = container?.querySelector(".dictionary-rows");
		if (!rowsContainer) return;

		const option = target.selectedOptions[0];
		const key = target.value === "$$empty$$" ? "" : target.value;
		const value = option?.dataset.val ?? "";

		rowsContainer.insertAdjacentHTML("beforeend", buildDictionaryRowHTML(key, value));
		target.selectedIndex = 0;

		// Only auto-save for presets, not empty rows
		if (key && container) void handleSave(container);
	});
}

async function handleSave(element: HTMLElement): Promise<void> {
	const name = element.getAttribute("setting-name") as ConfigKey;
	if (!name) return;

	const settingData = getDefinition(name);
	if (!isEditableSetting(settingData)) return;

	let value = await extractValue(element, name);

	if (value === undefined) return;
	if (settingData.encrypted) value = encryptSetting(value);

	await setConfig(name as ConfigKey, value);
	updateDependentVisibility(name, value);
	void invoke("flashTitlebar", "#5865F2");

	if (settingData.onChange) {
		void ipcRenderer.invoke(settingData.onChange);
	}
}

function updateDependentVisibility(changedName: string, newValue: unknown): void {
	const dependents = dependentElements.get(changedName);
	if (!dependents) return;

	for (const element of dependents) {
		const name = element.getAttribute("setting-name") as ConfigKey;
		if (!name) continue;

		const settingData = getDefinition(name);
		if (!isEditableSetting(settingData)) return;
		if (!settingData?.showAfter) continue;

		const shouldShow = evaluateShowAfter(settingData.showAfter.condition, newValue);
		element.closest("fieldset")?.classList.toggle("hidden", !shouldShow);
	}
}

async function extractValue<K extends ConfigKey>(element: HTMLElement, settingName: K): Promise<Config[K] | undefined> {
	try {
		// Dictionary
		if (element.classList.contains("dictionary-container")) {
			const result: Record<string, string> = {};
			for (const row of element.querySelectorAll(".dictionary-row")) {
				const keyInput = row.querySelector<HTMLInputElement>(".dict-key");
				const valInput = row.querySelector<HTMLInputElement>(".dict-value");
				const key = keyInput?.value.trim();
				if (key) result[key] = valInput?.value.trim() ?? "";
			}
			return result as Config[K];
		}

		// Input elements
		if (element instanceof HTMLInputElement) {
			switch (element.type) {
				case "checkbox":
					return element.checked as Config[K];
				case "text":
					return (element.dataset.hidden ? JSON.parse(element.value) : element.value) as Config[K];
				case "file":
					return await handleFileUpload(element, settingName);
			}
		}

		// Select elements
		if (element instanceof HTMLSelectElement) {
			return (element.multiple ? Array.from(element.selectedOptions).map((o) => o.value) : element.value) as Config[K];
		}

		// Textarea
		if (element instanceof HTMLTextAreaElement) {
			return parseTextareaToArray(element.value) as Config[K];
		}

		throw new Error(`Unsupported element type for: ${settingName}`);
	} catch (error) {
		console.error(`Failed to get ${settingName}'s value:`, error);
		return undefined;
	}
}

async function handleFileUpload<K extends ConfigKey>(input: HTMLInputElement, settingName: K): Promise<Config[K]> {
	const file = input.files?.[0];
	if (!file) throw new Error("No file selected");

	const buffer = await file.arrayBuffer();
	return invoke("utils:saveFileToGCFolder", settingName, Buffer.from(buffer)) as Promise<Config[K]>;
}

async function handleRevert(element: HTMLElement): Promise<void> {
	const name = element.getAttribute("setting-name") as ConfigKey;
	if (!name) return;

	const defaultValue = getDefinition(name)?.defaultValue;
	if (defaultValue === undefined) return;

	// Dictionary
	if (element.classList.contains("dictionary-container") && typeof defaultValue === "object") {
		const rowsContainer = element.querySelector(".dictionary-rows");
		if (rowsContainer) {
			rowsContainer.innerHTML = Object.entries(defaultValue as Record<string, string>)
				.map(([k, v]) => buildDictionaryRowHTML(k, v))
				.join("");
		}
	}
	// Checkbox
	else if (element instanceof HTMLInputElement && element.type === "checkbox") {
		element.checked = Boolean(defaultValue);
	}
	// File
	else if (element instanceof HTMLInputElement && element.type === "file") {
		await setConfig(name as ConfigKey, defaultValue);
		void invoke("flashTitlebar", "#5865F2");
		return;
	}
	// Text inputs
	else if (element instanceof HTMLInputElement) {
		element.value = String(defaultValue);
	}
	// Textarea
	else if (element instanceof HTMLTextAreaElement) {
		element.value = Array.isArray(defaultValue) ? defaultValue.join(",\n") : String(defaultValue);
	}

	await handleSave(element);
}

function parseTextareaToArray(input: string): string[] {
	return input
		.split(/[\r\n,]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

export function encryptSetting<K extends ConfigKey>(value: Config[K]): Config[K] {
	if (typeof value === "string") {
		return sendSync("utils:encryptSafeStorage", value) as Config[K];
	}
	if (Array.isArray(value)) {
		return value.map((v) => sendSync("utils:encryptSafeStorage", v as string)) as Config[K];
	}
	return value;
}

export function decryptSetting<K extends ConfigKey>(value: Config[K]): Config[K] {
	if (typeof value === "string") {
		return sendSync("utils:decryptSafeStorage", value) as Config[K];
	}
	if (Array.isArray(value)) {
		return value.map((v) => sendSync("utils:decryptSafeStorage", v as string)) as Config[K];
	}
	return value;
}

export function evaluateShowAfter(condition: (value: unknown) => boolean, value: unknown): boolean {
	return condition(value);
}

init().catch(console.error);
