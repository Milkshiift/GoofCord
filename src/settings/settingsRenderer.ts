import path from "path";
import fs from "fs";
import {ipcRenderer} from "electron";
import {evaluateShowAfter} from "./preload";

const settingsPath = path.join(__dirname, "../", "/assets/settings.json");
const settingsFile = fs.readFileSync(settingsPath, "utf-8");
const settings = JSON.parse(settingsFile);
const config = ipcRenderer.sendSync("config:getConfigBulk");

export async function renderSettings() {
    let html = "";
    Object.keys(settings).forEach(category => {
        html += makeCategory(category);
    });

    const settingsDiv = document.getElementById("settings");
    if (settingsDiv != undefined) {
        settingsDiv.innerHTML = html;
    }
}

function makeCategory(name: string) {
    let html = "";
    html += `<h2>${name}</h2>`;
    html += "<form class='settingsContainer'>";
    html += fillCategory(name);
    html += "</form>";
    return html;
}

function fillCategory(categoryName: string) {
    let html = "";
    const category = settings[categoryName];
    Object.keys(category).forEach(setting => {
        try {
            const entry = category[setting];
            if (entry.name === undefined) return;
            let value;
            if (setting === "encryptionPasswords") {
                value = ipcRenderer.sendSync("messageEncryption:getDecryptedPasswords");
            } else {
                // Getting a config value straight from the cached config skips a missing parameter check
                // but there will never be a missing parameter unless the user manually edits the config and
                // with the current config system this provides much better performance since we don't have to do ipc calls.
                value = config[setting];
            }
            const showAfter = entry.showAfter?.key+"$"+entry.showAfter?.value;
            console.log(evaluateShowAfter(entry.showAfter?.value, config[entry.showAfter?.key]))
            html += `
            <fieldset class="${evaluateShowAfter(entry.showAfter?.value, config[entry.showAfter?.key]) === false ? "hidden" : ""}">
                <div class='checkbox-container'>
                    ${getInputElement(entry, setting, value, showAfter)}
                    <label for="${setting}">${entry.name}</label>
                </div>
                <p class="description">${entry.description}</p>
            </fieldset>
            `;
        } catch (e) {console.error(e);}
    });
    return html;
}

function getInputElement(entry: { inputType: string; name: string; description: string; options: any[] }, setting: string, value: any, showAfter: string) {
    if (entry.inputType === "checkbox") {
        return `
            <input setting-name="${setting}" show-after="${showAfter}" id="${setting}" type="checkbox" ${value ? "checked" : ""}/>
        `;
    } else if (entry.inputType === "textfield") {
        return `
            <input setting-name="${setting}" show-after="${showAfter}" class="text" id="${setting}" type="text" value="${value}"/>
        `;
    } else if (entry.inputType === "textarea") {
        return `
            <textarea setting-name="${setting}" show-after="${showAfter}">${value.join(",\n")}</textarea>
        `;
    } else if (entry.inputType.startsWith("dropdown")) {
        return `
            <select setting-name="${setting}" show-after="${showAfter}" class="left dropdown" id="${setting}" name="${setting}" ${entry.inputType.endsWith("multiselect") ? "multiple" : ""}>
                ${entry.options.map((option: any) => `<option value="${option}" ${(option === value) || (Array.isArray(value) && value.includes(option)) ? "selected" : ""}>${option}</option>`).join("")}
            </select>
        `;
    }
}
