import { setConfig } from "@root/src/stores/config/config.preload.ts";
import { contextBridge, ipcRenderer } from "electron";
import { invoke, sendSync } from "../../../ipc/client.preload.ts";
import { type Config, type ConfigKey, type SettingEntry, settingsSchema } from "../../../settingsSchema.ts";
import { renderSettings } from "./settingsRenderer.ts";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
	loadCloud: () => invoke("cloud:loadCloud"),
	deleteCloud: () => invoke("cloud:deleteCloud"),
	saveCloud: () => invoke("cloud:saveCloud"),
	openFolder: (folder: string) => invoke("openFolder", folder),
	clearCache: () => invoke("cacheManager:clearCache"),
});

const settingsData: Record<string, SettingEntry> = {};
const elementsWithShowAfter: [string, HTMLElement][] = [];

async function initSettings() {
	while (document.body === null) await new Promise((resolve) => setTimeout(resolve, 10));
	await renderSettings();

	const elements = document.querySelectorAll<HTMLElement>("[setting-name]");
	for (const element of elements) {
		const name = element.getAttribute("setting-name");
		if (!name) continue;

		const revertButton = element.parentElement?.firstElementChild;
		revertButton?.addEventListener("click", () => revertSetting(element));
		element.addEventListener("change", () => saveSettings(element));

		const settingData = findKeyAtDepth(settingsSchema, name, 2);
		if (settingData?.showAfter) elementsWithShowAfter.push([name, element]);
		settingsData[name] = settingData;
	}
}

async function saveSettings(changedElement: HTMLElement) {
	const settingName = changedElement.getAttribute("setting-name");
	if (!settingName) return;

	const settingData = settingsData[settingName];
	let settingValue = await getSettingValue(changedElement, settingName as ConfigKey);
	if (settingValue === undefined) return;
	if (settingData.encrypted) settingValue = encryptSetting(settingValue);

	await setConfig(settingName as ConfigKey, settingValue);
	updateVisibility(settingName, settingValue);
	void invoke("flashTitlebar", "#5865F2");

	if (settingData.onChange) void ipcRenderer.invoke(settingData.onChange);
}

function updateVisibility(changedElementName: string, changedElementValue: unknown) {
	for (const [name, element] of elementsWithShowAfter) {
		const settingData = settingsData[name];
		if (settingData?.showAfter && settingData.showAfter.key === changedElementName) {
			const shouldShow = evaluateShowAfter(settingData.showAfter.condition, changedElementValue);
			element.closest("fieldset")?.classList.toggle("hidden", !shouldShow);
		}
	}
}

export function evaluateShowAfter(condition: (value: unknown) => boolean, value: unknown) {
	return condition(value);
}

async function getSettingValue<K extends ConfigKey>(element: HTMLElement, settingName: K): Promise<Config[K] | undefined> {
	try {
		if (element instanceof HTMLInputElement) {
			if (element.type === "checkbox") return element.checked as Config[K];
			if (element.type === "text") {
				if (element.dataset.hidden) return JSON.parse(element.value) as Config[K];
				return element.value as Config[K];
			}
			// Horror
			if (element.type === "file") {
				const file = element.files?.[0];
				if (!file) throw new Error("No file selected");

				return await new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = async (event) => {
						const fileContent = event.target?.result;
						if (!fileContent) return reject(new Error("No file content"));
						if (typeof fileContent === "string") return reject(new Error("File content is a string"));

						try {
							const result = await invoke("utils:saveFileToGCFolder", settingName, Buffer.from(new Uint8Array(fileContent)) as unknown as string);
							resolve(result as Config[K]);
						} catch (ipcError) {
							reject(ipcError);
						}
					};
					reader.onerror = (error) => reject(new Error("Error reading file: " + error));
					reader.readAsArrayBuffer(file);
				});
			}
		} else if (element instanceof HTMLSelectElement) {
			return (element.multiple ? Array.from(element.selectedOptions).map((option) => option.value) : element.value) as Config[K];
		} else if (element instanceof HTMLTextAreaElement) {
			return createArrayFromTextarea(element.value) as Config[K];
		}
		throw new Error(`Unsupported element type for: ${settingName}`);
	} catch (error) {
		console.error(`Failed to get ${settingName}'s value:`, error);
		return undefined;
	}
}

export async function revertSetting(setting: HTMLElement) {
	const elementName = setting.getAttribute("setting-name");
	if (!elementName) return;

	const defaultValue = settingsData[elementName]?.defaultValue;

	if (setting instanceof HTMLInputElement) {
		if (setting.type === "checkbox" && typeof defaultValue === "boolean") {
			setting.checked = defaultValue;
		} else if (setting.type === "file") {
			await setConfig(elementName as ConfigKey, defaultValue);
			void invoke("flashTitlebar", "#5865F2");
			return;
		} else if (typeof defaultValue === "string") {
			setting.value = defaultValue;
		}
	} else if (setting instanceof HTMLTextAreaElement && typeof defaultValue === "string") {
		setting.value = Array.isArray(defaultValue) ? defaultValue.join(",\n") : defaultValue;
	}

	await saveSettings(setting);
}

function createArrayFromTextarea(input: string): string[] {
	return input
		.split(/[\r\n,]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

export function encryptSetting<K extends ConfigKey>(settingValue: Config[K]) {
	if (typeof settingValue === "string") {
		return sendSync("utils:encryptSafeStorage", settingValue);
	}
	if (Array.isArray(settingValue)) {
		return settingValue.map((value: unknown) => sendSync("utils:encryptSafeStorage", value as string));
	}
	return settingValue;
}

export function decryptSetting<K extends ConfigKey>(settingValue: Config[K]) {
	if (typeof settingValue === "string") {
		return sendSync("utils:decryptSafeStorage", settingValue);
	}
	if (Array.isArray(settingValue)) {
		return settingValue.map((value: unknown) => sendSync("utils:decryptSafeStorage", value as string));
	}
	return settingValue;
}

// biome-ignore lint/suspicious/noExplicitAny: Generic object traversal requires any
export function findKeyAtDepth(obj: Record<string, any>, targetKey: string, depth: number): any {
	if (depth === 1) {
		return obj[targetKey] || undefined;
	}

	for (const key in obj) {
		if (typeof obj[key] === "object" && obj[key] !== null) {
			const result = findKeyAtDepth(obj[key], targetKey, depth - 1);
			if (result !== undefined) {
				return result;
			}
		}
	}

	return undefined;
}

initSettings().catch(console.error);
