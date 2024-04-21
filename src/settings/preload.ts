// RENDERER
import {contextBridge, ipcRenderer} from "electron";
import {renderSettings} from "./settingsRenderer";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
    openScriptsFolder: () => ipcRenderer.invoke("openFolder", "scripts"),
    openExtensionsFolder: () => ipcRenderer.invoke("openFolder", "extensions"),
    openStorageFolder: () => ipcRenderer.invoke("openFolder", "storage"),
    crash: () => ipcRenderer.invoke("crash"),
    decryptSafeStorage: (string: string) => ipcRenderer.invoke("decryptSafeStorage", string),
});

(async () => {
    // DOMContentLoaded is too late and causes a flicker when rendering, so we wait until the body is accessible manually
    while (document.body === null) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    await renderSettings();

    elements = Array.from(document.querySelectorAll("[data-setting]")) as HTMLInputElement[];
    elements.forEach((element) => {
        element.addEventListener("change", async () => {
            saveSettings();
        });
    });
})();

let elements: HTMLInputElement[];

async function saveSettings() {
    const settingsObj = await ipcRenderer.invoke("config:getConfigBulk");
    for (const element of elements) {
        const settingName = element.getAttribute("data-setting");
        try {
            let settingValue: string | boolean | string[] | undefined;

            if (element.tagName === "SELECT" || element.type === "text") {
                settingValue = element.value;
            } else if (element.type === "checkbox") {
                settingValue = element.checked;
            } else if (element.tagName === "TEXTAREA") {
                if (settingName === "encryptionPasswords") {
                    settingValue = await createArrayFromTextareaEncrypted(element.value);
                } else {
                    settingValue = createArrayFromTextarea(element.value);
                }
            } else {
                settingValue = undefined;
            }
            settingsObj[settingName!] = settingValue;
        } catch (e) {
            console.error(`Failed to write "${settingName}" value to the config:`, e);
        }
    }

    console.log(settingsObj);
    ipcRenderer.invoke("config:setConfigBulk", settingsObj);
    ipcRenderer.invoke("flashTitlebar", "#5865F2");
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
