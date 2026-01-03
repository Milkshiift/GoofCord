import { i } from "@root/src/stores/localization/localization.preload.ts";
import { invoke } from "../../../ipc/client.preload.ts";
import type { ConfigKey, InputTypeMap, SettingEntry } from "../../../settingsSchema.ts";

const escapeHTML = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface Strategy<K extends keyof InputTypeMap> {
	render(entry: SettingEntry<K>, key: ConfigKey, value: InputTypeMap[K]): string;
	extract(element: HTMLElement, key: ConfigKey): Promise<InputTypeMap[K]>;
	setValue(element: HTMLElement, value: InputTypeMap[K]): void;
}

type StrategyMap = {
	[K in keyof InputTypeMap]: Strategy<K>;
};

const buildDictionaryRow = (key = "", value = "") => `
	<div class="dictionary-row">
		<input type="text" class="dict-key" placeholder="${i("settings-dictionary-key")}" value="${escapeHTML(key)}" />
		<input type="text" class="dict-value" placeholder="${i("settings-dictionary-value")}" value="${escapeHTML(value)}" />
		<button type="button" class="dictionary-remove-btn" title="Remove">✕</button>
	</div>`;

export const Strategies: StrategyMap = {
	checkbox: {
		render: (_, k, v) => `<input setting-name="${k}" id="${k}" type="checkbox" ${v ? "checked" : ""}/>`,
		extract: async (el) => (el as HTMLInputElement).checked,
		setValue: (el, v) => {
			(el as HTMLInputElement).checked = v;
		},
	},

	textfield: {
		render: (_, k, v) => `<input setting-name="${k}" id="${k}" class="text" type="text" value="${escapeHTML(v)}"/>`,
		extract: async (el) => (el as HTMLInputElement).value,
		setValue: (el, v) => {
			(el as HTMLInputElement).value = v;
		},
	},

	textarea: {
		render: (_, k, v) => {
			const text = v.join(",\n");
			return `<textarea setting-name="${k}" id="${k}">${escapeHTML(text)}</textarea>`;
		},
		extract: async (el) =>
			(el as HTMLTextAreaElement).value
				.split(/[\r\n,]+/)
				.map((s) => s.trim())
				.filter(Boolean),
		setValue: (el, v) => {
			(el as HTMLTextAreaElement).value = v.join(",\n");
		},
	},

	file: {
		render: (e, k) => `<input setting-name="${k}" id="${k}" accept="${e.accept || "*"}" type="file"/>`,
		extract: async (el, key) => {
			const file = (el as HTMLInputElement).files?.[0];
			if (!file) throw new Error("No file selected");
			const buffer = await file.arrayBuffer();
			return await invoke("utils:saveFileToGCFolder", key, Buffer.from(buffer));
		},
		setValue: (el) => {
			(el as HTMLInputElement).value = "";
		},
	},

	dropdown: {
		render: (e, k, v) => {
			const options = Array.isArray(e.options) ? e.options : Object.keys(e.options ?? {});
			const html = options.map((opt) => `<option value="${opt}"${v === String(opt) ? " selected" : ""}>${opt}</option>`).join("");
			return `<select setting-name="${k}" id="${k}" class="left dropdown" name="${k}">${html}</select>`;
		},
		extract: async (el) => (el as HTMLSelectElement).value,
		setValue: (el, v) => {
			(el as HTMLSelectElement).value = v;
		},
	},

	"dropdown-multiselect": {
		render: (e, k, v) => {
			const selected = new Set(v);
			const options = Array.isArray(e.options) ? e.options : Object.keys(e.options ?? {});
			const html = options.map((opt) => `<option value="${opt}"${selected.has(String(opt)) ? " selected" : ""}>${opt}</option>`).join("");
			return `<select setting-name="${k}" id="${k}" class="left dropdown" name="${k}" multiple>${html}</select>`;
		},
		extract: async (el) => Array.from((el as HTMLSelectElement).selectedOptions).map((o) => o.value),
		setValue: (el, v) => {
			const defaults = new Set(v);
			for (const opt of (el as HTMLSelectElement).options) opt.selected = defaults.has(opt.value);
		},
	},

	dictionary: {
		render: (e, k, v) => {
			const rows = Object.entries(v)
				.map(([dk, dv]) => buildDictionaryRow(dk, dv))
				.join("");

			const presets = (Array.isArray(e.options) ? e.options : []) as Array<string | [string, string]>;
			const presetsHTML = presets
				.map((opt) => {
					const [key, val] = Array.isArray(opt) ? opt : [opt, ""];
					return `<option value="${escapeHTML(key)}" data-val="${escapeHTML(val)}">${escapeHTML(key)}</option>`;
				})
				.join("");

			return `
				<div class="dictionary-container" setting-name="${k}" id="${k}">
					<div class="dictionary-rows">${rows}</div>
					<div class="dictionary-controls">
						<select class="dictionary-preset-select">
							<option value="" disabled selected>${i("settings-dictionary-add")}</option>
							<option value="$$empty$$">${i("settings-dictionary-custom")}</option>
							${presetsHTML}
						</select>
					</div>
				</div>`;
		},
		extract: async (el) => {
			const result: Record<string, string> = {};
			for (const row of el.querySelectorAll(".dictionary-row")) {
				const k = row.querySelector<HTMLInputElement>(".dict-key")?.value.trim();
				if (k) result[k] = row.querySelector<HTMLInputElement>(".dict-value")?.value.trim() ?? "";
			}
			return result;
		},
		setValue: (el, v) => {
			const container = el.querySelector(".dictionary-rows");
			if (container) {
				container.innerHTML = Object.entries(v)
					.map(([k, val]) => buildDictionaryRow(k, val))
					.join("");
			}
		},
	},
};

export const createDictionaryRow = buildDictionaryRow;
