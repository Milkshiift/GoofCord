// RENDERER
import {contextBridge, ipcRenderer} from "electron";
import {renderSettings} from "./settingsRenderer";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
    loadCloud: () => ipcRenderer.invoke("loadCloud"),
    deleteCloud: () => ipcRenderer.invoke("deleteCloud"),
    saveCloud: () => ipcRenderer.invoke("saveCloud"),
    openFolder: (folder: string) => ipcRenderer.invoke("openFolder", folder),
    clearCache: () => ipcRenderer.invoke("clearCache"),
    crash: () => ipcRenderer.invoke("crash"),
});

(async () => {
    // DOMContentLoaded is too late and causes a flicker when rendering, so we wait until body is accessible manually
    while (document.body === null) {
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    await renderSettings();

    elements = Array.from(document.querySelectorAll("[setting-name]")) as HTMLInputElement[];
    elements.forEach((element) => {
        // Revert button
        [...element.parentElement!.children][0].addEventListener("click", () => revertSetting(element));
        element.addEventListener("change", () => saveSettings(element));
    });
})();

let elements: HTMLInputElement[];
const settingsObj = ipcRenderer.sendSync("config:getConfigBulk");

async function saveSettings(changedElement: HTMLInputElement) {
    const changedElementName = changedElement.getAttribute("setting-name")!;
    const changedElementValue = await getSettingValue(changedElement, changedElementName);
    // Value should never be undefined in production but still kept as a failsafe to not overwrite existing value with undefined
    if (changedElementValue === undefined) {
        return;
    }
    settingsObj[changedElementName] = changedElementValue;

    updateVisibility(changedElementName, changedElementValue);

    console.log(settingsObj);
    await ipcRenderer.invoke("config:setConfigBulk", settingsObj);
    void ipcRenderer.invoke("flashTitlebar", "#5865F2");
}

function updateVisibility(changedElementName: string, changedElementValue: any) {
    elements.forEach(element => {
        const elementShowAfter = element.getAttribute("show-after")?.split("$");
        if (elementShowAfter && elementShowAfter[0] === changedElementName) {
            const shouldShow = evaluateShowAfter(elementShowAfter[1], changedElementValue);
            element.closest('fieldset')?.classList.toggle('hidden', !shouldShow);
        }
    });
}

export function evaluateShowAfter(condition: string | undefined, arg: any) {
    if (!condition) return;
    return ((0, eval)("(arg)=>{"+condition+"}"))(arg);
}

async function getSettingValue(element: HTMLInputElement, settingName: string) {
    try {
        if (element.tagName === "SELECT" || element.type === "text") {
            if (element.multiple) {
                const selected = element.querySelectorAll(`option:checked`);
                return Array.from(selected).map(option => (option as HTMLOptionElement).value);
            }
            return element.value;
        } else if (element.type === "checkbox") {
            return element.checked;
        } else if (element.tagName === "TEXTAREA") {
            if (settingName === "encryptionPasswords") {
                return await createArrayFromTextareaEncrypted(element.value);
            } else {
                return createArrayFromTextarea(element.value);
            }
        } else if (element.type === "file") {
            const path = element.files?.[0]?.path;
            return path ? path : "";
        }
        throw new Error(`Unsupported element type: ${element.tagName}, ${element.type}`);
    } catch (error: any) {
        console.error(`Failed to get ${settingName}'s value:`, error);
        return undefined;
    }
}

export async function revertSetting(setting: HTMLInputElement) {
    const elementName = setting.getAttribute("setting-name")!;
    const defaultValue = ipcRenderer.sendSync("config:getDefaultValue", elementName);
    if (setting.type === "text") {
        setting.value = defaultValue;
    } else if (setting.type === "checkbox") {
        setting.checked = defaultValue;
    } else if (setting.type === "file") {
        setting.files = null;
    } else if (setting.tagName === "TEXTAREA") {
        setting.value = Array.isArray(defaultValue) ? defaultValue.join(",\n") : defaultValue;
    }
    //else if (setting.tagName === "SELECT") {
    //    const selects = setting.children;
    //    for (const select of selects) {
    //        select.selected = defaultValue === (select as HTMLOptionElement).value;
    //    }
    //}
    await saveSettings(setting);
}

function createArrayFromTextarea(input: string) {
    return input.replace(/(\r\n|\n|\r|\s+)/gm, "").replace(/,$/, "").split(",");
}

async function createArrayFromTextareaEncrypted(input: string) {
    const arrayFromTextArea = createArrayFromTextarea(input);
    return Promise.all(arrayFromTextArea.map(password =>
        ipcRenderer.invoke("encryptSafeStorage", password)
    ));
}
