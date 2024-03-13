import {getConfig} from "../config";
import path from "path";
import fs from "fs";

const settingsPath = path.join(__dirname, "../", "/assets/settings.json");
const settingsFile = fs.readFileSync(settingsPath, "utf-8");
const settings = JSON.parse(settingsFile);

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
            if (entry.inputType === "checkbox") {
                html += `
            <fieldset>
                <div class='checkbox-container'>
                    <input data-setting="${setting}" id="${setting}" type="checkbox" ${getConfig(setting) ? "checked" : ""}/>
                    <label for="${setting}">${entry.name}</label>
                </div>
                <p class="description">${entry.description}</p>
            </fieldset>
            `;
            } else if (entry.inputType === "textfield") {
                html += `
            <fieldset>
                <div class='checkbox-container'>
                    <input class="text" data-setting="${setting}" id="${setting}" type="text" value="${getConfig(setting)}"/>
                    <label for="${setting}">${entry.name}</label>
                </div>
                <p class="description">${entry.description}</p>
            </fieldset>
            `;
            } else if (entry.inputType === "textarea") {
                html += `
            <fieldset>
                <div class='checkbox-container'>
                    <textarea data-setting="${setting}">${getConfig(setting).join(",\n")}</textarea>
                </div>
                <p class="description">${entry.description}</p>
            </fieldset>
            `;
            } else if (entry.inputType === "dropdown") {
                html += `
            <fieldset>
                <div class='checkbox-container'>
                    <select class="left dropdown" data-setting="${setting}" id="${setting}" name="${setting}">
                        ${entry.options.map((option: any) => `<option value="${option}" ${option === getConfig(setting) ? "selected" : ""}>${option}</option>`).join("")}
                    </select>
                    <label for="${setting}">${entry.name}</label>
                </div>
                <p class="description">${entry.description}</p>
            </fieldset>
            `;
            }
        } catch (e) {console.error(e);}
    });
    return html;
}