// RENDERER
import {contextBridge, ipcRenderer} from "electron";
import {renderSettings} from "./settingsRenderer";

console.log("GoofCord Settings");

contextBridge.exposeInMainWorld("settings", {
    openScriptsFolder: () => ipcRenderer.send("openScriptsFolder"),
    openExtensionsFolder: () => ipcRenderer.send("openExtensionsFolder"),
    openStorageFolder: () => ipcRenderer.send("openStorageFolder"),
    openCrashesFolder: () => ipcRenderer.send("openCrashesFolder"),
    copyDebugInfo: () => ipcRenderer.send("copyDebugInfo"),
    crash: () => ipcRenderer.send("crash"),
    decryptSafeStorage: (string: string) => ipcRenderer.invoke("decryptSafeStorage", string),
});

(async () => {
    while (document.body === null) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    await renderSettings();

    const elements = document.querySelectorAll("[data-setting]");
    elements.forEach((element) => {
        element.addEventListener("change", async () => {
            saveSettings();
        });
    });
})();

async function saveSettings() {
    const elements = Array.from(document.querySelectorAll("[data-setting]")) as HTMLInputElement[];
    const settingsObj = ipcRenderer.sendSync("config:getConfigBulk");
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
    ipcRenderer.send("config:setConfigBulk", settingsObj);
    ipcRenderer.send("flashTitlebar", "#5865F2");
}

function createArrayFromTextarea(input: string) {
    let inputValue = input.replace(/(\r\n|\n|\r|\s+)/gm, "");
    if (inputValue.endsWith(",")) {
        inputValue = inputValue.slice(0, -1);
    }
    return inputValue.split(",");
}

async function createArrayFromTextareaEncrypted(input: string) {
    let inputValue = input.replace(/(\r\n|\n|\r|\s+)/gm, "");
    if (inputValue.endsWith(",")) {
        inputValue = inputValue.slice(0, -1);
    }
    const encryptedPasswords: string[] = [];
    const arrayFromTextArea = inputValue.split(",");
    for (const password in arrayFromTextArea) {
        encryptedPasswords.push(await ipcRenderer.invoke("encryptSafeStorage", arrayFromTextArea[password]));
    }
    return encryptedPasswords;
}