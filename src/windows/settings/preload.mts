import { contextBridge, ipcRenderer } from "electron";
import { settingsSchema } from "../../settingsSchema.ts";
import { renderSettings, type SettingEntry } from "./settingsRenderer.ts";
import { findKeyAtDepth } from "../preloadUtils.ts";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
	loadCloud: () => ipcRenderer.invoke("loadCloud"),
	deleteCloud: () => ipcRenderer.invoke("deleteCloud"),
	saveCloud: () => ipcRenderer.invoke("saveCloud"),
	openFolder: (folder: string) => ipcRenderer.invoke("openFolder", folder),
	clearCache: () => ipcRenderer.invoke("clearCache"),
	crash: () => ipcRenderer.invoke("crash"),
});

const settingsData: Record<string, SettingEntry> = {};
const elementsWithShowAfter: [string, HTMLElement][] = [];

async function initializeSettings() {
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
	let settingValue = await getSettingValue(changedElement, settingName);
	if (settingValue === undefined) return;
	if (settingData.encrypted) {
		if (typeof settingValue === "string") {
			settingValue = ipcRenderer.sendSync("utils:encryptSafeStorage", settingValue);
		} else if (Array.isArray(settingValue)) {
			settingValue = settingValue.map((value) => ipcRenderer.sendSync("utils:encryptSafeStorage", value));
		}
	}

	void ipcRenderer.invoke("config:setConfig", settingName, settingValue);
	updateVisibility(settingName, settingValue);
	void ipcRenderer.invoke("flashTitlebar", "#5865F2");
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

async function getSettingValue(element: HTMLElement, settingName: string) {
	try {
		if (element instanceof HTMLInputElement) {
			if (element.type === "checkbox") return element.checked;
			if (element.type === "text") return element.value;
			// Horror
			if (element.type === "file") {
				const file = element.files![0];
				if (!file) throw new Error("No file selected");

				return await new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = async (event) => {
						const fileContent = event.target?.result;
						if (!fileContent) return reject(new Error("No file content"));
						if (typeof fileContent === "string") return reject(new Error("File content is a string"));

						try {
							const result = await ipcRenderer.invoke("utils:saveFileToGCFolder", settingName, Buffer.from(new Uint8Array(fileContent)));
							resolve(result);
						} catch (ipcError) {
							reject(ipcError);
						}
					};
					reader.onerror = (error) => reject(new Error("Error reading file: " + error));
					reader.readAsArrayBuffer(file);
				});
			}
		} else if (element instanceof HTMLSelectElement) {
			return element.multiple ? Array.from(element.selectedOptions).map((option) => option.value) : element.value;
		} else if (element instanceof HTMLTextAreaElement) {
			return createArrayFromTextarea(element.value);
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
			setting.value = "";
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

initializeSettings().catch(console.error);
