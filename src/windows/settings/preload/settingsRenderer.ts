import { webFrame } from "electron";
import { sendSync } from "../../../ipc/client.ts";
import { type ButtonEntry, type ConfigKey, type ConfigValue, type SettingEntry, settingsSchema } from "../../../settingsSchema.ts";
import { decryptSetting, evaluateShowAfter } from "./preload.mts";

function sanitizeForId(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

export async function renderSettings() {
	const categoryKeys = Object.keys(settingsSchema);

	let panelHtml = "";
	categoryKeys.forEach((categoryName, index) => {
		const panelId = `panel-${sanitizeForId(categoryName)}`;
		const isActive = index === 0 ? "active" : "";
		const { settingsHtml, buttonsHtml } = generatePanelInnerContent(categoryName);

		panelHtml += `
            <div id="${panelId}" class="content-panel ${isActive}">

                <form class="settingsContainer">
                    ${settingsHtml}
                    ${buttonsHtml ? `<div class="buttonContainer">${buttonsHtml}</div>` : ""}
                </form>
            </div>
        `;
	});

	let tabHtml = "";
	categoryKeys.forEach((categoryName, index) => {
		const panelId = `panel-${sanitizeForId(categoryName)}`;
		const isActive = index === 0 ? "active" : "";
		const categoryTitle = sendSync("localization:i", `category-${categoryName.toLowerCase().split(" ")[0]}`);

		tabHtml += `
            <button class="tab-item ${isActive}" data-target="${panelId}">${categoryTitle}</button>
        `;
	});

	document.body.innerHTML = `
        <div class="settings-page-container">
			<header class="settings-header">
				<nav class="settings-tabs" aria-label="Settings Categories">
					${tabHtml}
				</nav>
			</header>

			${
				sendSync("utils:isEncryptionAvailable")
					? ""
					: `
				<div class="message warning">
					<p>${sendSync("localization:i", "settings-encryption-unavailable")}</p>
				</div>
			`
			}

            <div class="settings-content">
                ${panelHtml}
            </div>
        </div>
    `;

	void webFrame.executeJavaScript("window.initSwitcher(); window.initMultiselect();");
}

function generatePanelInnerContent(categoryName: string): { settingsHtml: string; buttonsHtml: string } {
	let buttonsHtml = "";
	let settingsHtml = "";

	// @ts-expect-error
	for (const [setting, entry] of Object.entries(settingsSchema[categoryName])) {
		if (setting.startsWith("button-")) {
			buttonsHtml += createButton(setting, entry as ButtonEntry);
		} else {
			settingsHtml += createSetting(setting as ConfigKey, entry as SettingEntry);
		}
	}

	return { settingsHtml, buttonsHtml };
}

function createSetting(setting: ConfigKey, entry: SettingEntry): string | "" {
	let value: ConfigValue<ConfigKey> = sendSync("config:getConfig", setting);

	if (setting === "disableSettingsAnimations" && value === true) {
		document.body.classList.add("disable-animations");
	}

	if (entry.encrypted && typeof value === "string") {
		value = decryptSetting(value);
	}

	let isHidden = false;
	if (!entry.name) {
		isHidden = true;
		entry.inputType = "textfield";
	}
	if (entry.showAfter) {
		const controllingValue = sendSync("config:getConfig", entry.showAfter.key as ConfigKey);
		isHidden = !evaluateShowAfter(entry.showAfter.condition, controllingValue);
	}

	const name = sendSync("localization:i", `opt-${setting}`) ?? setting;
	const description = sendSync("localization:i", `opt-${setting}-desc`) ?? "";

	return `
        <fieldset class="${(isHidden ? "hidden" : "") + " " + (entry.showAfter && entry.showAfter.key !== setting ? "offset" : "")}">
            <div class='checkbox-container'>
                <div class="revert-button" title="Revert to default value"></div>
                ${getInputElement(entry, setting, value)}
                <label for="${setting}">${name}</label>
            </div>
            <p class="description">${description}</p>
        </fieldset>
    `;
}

function createButton(id: string, entry: ButtonEntry): string {
	const buttonText = sendSync("localization:i", `opt-${id}`);
	return `<button type="button" onclick="${entry.onClick}">${buttonText}</button>`;
}

function getInputElement(entry: SettingEntry, setting: ConfigKey, value: ConfigValue<ConfigKey>): string {
	if (!entry.name) {
		return `<input data-hidden="true" setting-name="${setting}" class="text" id="${setting}" type="text" value="${escapeHtmlValue(JSON.stringify(value))}"/>`;
	}

	switch (entry.inputType) {
		case "checkbox":
			return `<input setting-name="${setting}" id="${setting}" type="checkbox" ${value ? "checked" : ""}/>`;
		case "textfield":
			return `<input setting-name="${setting}" class="text" id="${setting}" type="text" value="${escapeHtmlValue(String(value))}"/>`;
		case "textarea": {
			const textValue = Array.isArray(value) ? value.join(",\n") : String(value);
			return `<textarea setting-name="${setting}" id="${setting}">${escapeHtmlValue(textValue)}</textarea>`;
		}
		case "file":
			return `<input setting-name="${setting}" id="${setting}" accept="${entry.accept || "*"}" type="file"/>`;
		case "dropdown":
		case "dropdown-multiselect": {
			const isMultiselect = entry.inputType === "dropdown-multiselect";
			const selectValue = Array.isArray(value) ? value : [String(value)];

			const optionsList = Array.isArray(entry.options) ? entry.options : entry.options ? Object.keys(entry.options) : [];

			return `
                <select setting-name="${setting}" class="left dropdown" id="${setting}" name="${setting}" ${isMultiselect ? "multiple" : ""}>
                    ${optionsList
											.map((option) => {
												const optionStr = String(option);
												const isSelected = selectValue.includes(optionStr);
												return `
                                <option value="${optionStr}" ${isSelected ? "selected" : ""}>
                                    ${optionStr}
                                </option>
                             `;
											})
											.join("")}
                </select>
            `;
		}
		default:
			console.warn(`Unsupported input type: ${entry.inputType} for setting ${setting}`);
			return `<span>Unsupported input type: ${entry.inputType}</span>`;
	}
}

function escapeHtmlValue(unsafeString: string) {
	return unsafeString.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
