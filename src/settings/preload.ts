// RENDERER
import {contextBridge, ipcRenderer} from "electron";
import {renderSettings} from "./settingsRenderer";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
    openScriptsFolder: () => ipcRenderer.invoke("openFolder", "scripts"),
    openExtensionsFolder: () => ipcRenderer.invoke("openFolder", "extensions"),
    openStorageFolder: () => ipcRenderer.invoke("openFolder", "storage"),
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
        element.addEventListener("change", async () => {
            await saveSettings(element);
        });
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

    // showAfter implementation. There is maybe a better way
    for (const element of elements) {
        const elementShowAfter = element.getAttribute("show-after")?.split("$");
        if (elementShowAfter == null || elementShowAfter[0] === undefined) continue;
        if (changedElementName === elementShowAfter[0]) {
            if (evaluateShowAfter(elementShowAfter[1], changedElementValue)) {
                element.parentElement?.parentElement?.classList.remove('hidden');
            } else {
                element.parentElement?.parentElement?.classList.add('hidden');
            }
        }
    }

    console.log(settingsObj);
    void ipcRenderer.invoke("config:setConfigBulk", settingsObj);
    void ipcRenderer.invoke("flashTitlebar", "#5865F2");
}

async function getSettingValue(element: HTMLInputElement, settingName: string) {
    try {
        if (element.tagName === "SELECT" || element.type === "text") {
            if (element.multiple) {
                const selected = document.querySelectorAll(`[setting-name="${settingName}"] option:checked`);
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
        }
        throw new Error(`Unsupported element type: ${element.tagName}, ${element.type}`);
    } catch (error: any) {
        console.error(`Failed to get ${settingName}'s value:`, error);
        return undefined;
    }
}

function createArrayFromTextarea(input: string) {
    let inputValue = input.replace(/(\r\n|\n|\r|\s+)/gm, "");
    if (inputValue.endsWith(",")) {
        inputValue = inputValue.slice(0, -1);
    }
    return inputValue.split(",");
}

async function createArrayFromTextareaEncrypted(input: string) {
    const arrayFromTextArea = createArrayFromTextarea(input);
    const encryptedPasswords: string[] = [];
    for (const password in arrayFromTextArea) {
        encryptedPasswords.push(await ipcRenderer.invoke("encryptSafeStorage", arrayFromTextArea[password]));
    }
    return encryptedPasswords;
}

export function evaluateShowAfter(condition: string | undefined, arg: any) {
    if (!condition) return;
    return ((0, eval)("(arg)=>{"+condition+"}"))(arg);
}
