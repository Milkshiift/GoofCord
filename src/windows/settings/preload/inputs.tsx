import { i } from "@root/src/stores/localization/localization.preload.ts";
import type { ComponentType, JSX } from "preact";
import { useCallback, useState } from "preact/hooks";
import { invoke } from "../../../ipc/client.preload.ts";
import type { SettingEntry } from "../../../settingsSchema.ts";
import { MultiSelect } from "./MultiSelect.tsx";

export interface InputProps {
	id: string;
	value: unknown;
	onChange: (value: unknown) => void;
	entry: SettingEntry | null;
}

function CheckboxInput({ id, value, onChange }: InputProps): JSX.Element {
	return <input type="checkbox" id={id} setting-name={id} checked={value as boolean} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />;
}

function TextFieldInput({ id, value, onChange }: InputProps): JSX.Element {
	return <input type="text" id={id} setting-name={id} class="text" value={value as string} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />;
}

function DropdownInput({ id, value, onChange, entry }: InputProps): JSX.Element {
	const options = Array.isArray(entry?.options) ? entry.options : Object.keys(entry?.options ?? {});

	return (
		<select id={id} setting-name={id} class="left dropdown" value={value as string} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
			{options.map((opt) => (
				<option key={String(opt)} value={String(opt)}>
					{String(opt)}
				</option>
			))}
		</select>
	);
}

function MultiSelectInput({ id, value, onChange, entry }: InputProps): JSX.Element {
	const options = Array.isArray(entry?.options) ? entry.options : Object.keys(entry?.options ?? {});
	return <MultiSelect id={id} options={options.map(String)} value={value as string[]} onChange={onChange} />;
}

function FileInput({ id, onChange, entry }: InputProps): JSX.Element {
	const handleChange = async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const buffer = await file.arrayBuffer();
		const path = await invoke("utils:saveFileToGCFolder", id, Buffer.from(buffer));
		onChange(path);
	};

	return <input type="file" id={id} setting-name={id} accept={entry?.accept ?? "*"} onChange={handleChange} />;
}

function ListInput({ id, value, onChange }: InputProps): JSX.Element {
	const items = value as string[];

	const handleAdd = () => onChange([...items, ""]);

	const handleRemove = (index: number) => {
		onChange(items.filter((_, i) => i !== index));
	};

	const handleItemChange = (index: number, newValue: string) => {
		const updated = [...items];
		updated[index] = newValue;
		onChange(updated);
	};

	return (
		<div class="dictionary-container" id={id} setting-name={id}>
			<div class="dictionary-rows">
				{items.map((item, idx) => (
					<div key={idx} class="dictionary-row">
						<input type="text" class="list-value" value={item} onChange={(e) => handleItemChange(idx, (e.target as HTMLInputElement).value)} />
						<button type="button" class="dictionary-remove-btn" onClick={() => handleRemove(idx)}>
							✕
						</button>
					</div>
				))}
			</div>
			<div class="dictionary-controls">
				<button type="button" class="list-add-btn" onClick={handleAdd}>
					{i("settings-dictionary-add")}
				</button>
			</div>
		</div>
	);
}

function DictionaryInput({ id, value, onChange, entry }: InputProps): JSX.Element {
	const dictValue = value as Record<string, string>;
	const [entries, setEntries] = useState(() => Object.entries(dictValue));

	const syncToParent = useCallback(
		(newEntries: [string, string][]) => {
			setEntries(newEntries);
			const obj: Record<string, string> = {};
			for (const [k, v] of newEntries) {
				if (k.trim()) obj[k.trim()] = v.trim();
			}
			onChange(obj);
		},
		[onChange],
	);

	const handleAdd = (key = "", val = "") => {
		syncToParent([...entries, [key, val]]);
	};

	const handleRemove = (index: number) => {
		syncToParent(entries.filter((_, i) => i !== index));
	};

	const handleKeyChange = (index: number, newKey: string) => {
		const updated = [...entries];
		updated[index] = [newKey, updated[index][1]];
		syncToParent(updated);
	};

	const handleValueChange = (index: number, newValue: string) => {
		const updated = [...entries];
		updated[index] = [updated[index][0], newValue];
		syncToParent(updated);
	};

	const handlePresetChange = (e: Event) => {
		const select = e.target as HTMLSelectElement;
		const option = select.selectedOptions[0];
		const key = select.value === "$$empty$$" ? "" : select.value;
		const val = option?.dataset.val ?? "";
		select.selectedIndex = 0;
		handleAdd(key, val);
	};

	const presets = (Array.isArray(entry?.options) ? entry.options : []) as Array<string | [string, string]>;

	return (
		<div class="dictionary-container" id={id} setting-name={id}>
			<div class="dictionary-rows">
				{entries.map(([k, v], idx) => (
					<div key={idx} class="dictionary-row">
						<input type="text" class="dict-key" placeholder={i("settings-dictionary-key")} value={k} onChange={(e) => handleKeyChange(idx, (e.target as HTMLInputElement).value)} />
						<input type="text" class="dict-value" placeholder={i("settings-dictionary-value")} value={v} onChange={(e) => handleValueChange(idx, (e.target as HTMLInputElement).value)} />
						<button type="button" class="dictionary-remove-btn" onClick={() => handleRemove(idx)}>
							✕
						</button>
					</div>
				))}
			</div>
			<div class="dictionary-controls">
				<select class="dictionary-preset-select" onChange={handlePresetChange}>
					<option value="" disabled selected>
						{i("settings-dictionary-add")}
					</option>
					<option value="$$empty$$">{i("settings-dictionary-custom")}</option>
					{presets.map((opt) => {
						const [key, val] = Array.isArray(opt) ? opt : [opt, ""];
						return (
							<option key={key} value={key} data-val={val}>
								{key}
							</option>
						);
					})}
				</select>
			</div>
		</div>
	);
}

function JsonInput({ id, value, onChange }: InputProps): JSX.Element {
	const [text, setText] = useState(() => (typeof value === "string" ? value : JSON.stringify(value, null, "\t")));
	const [error, setError] = useState<string | null>(null);

	const handleBlur = () => {
		try {
			const parsed = JSON.parse(text);
			setError(null);
			onChange(parsed);
		} catch (e) {
			setError((e as Error).message);
		}
	};

	return (
		<div class="json-input-wrapper">
			<textarea id={id} setting-name={id} class="code-font" spellcheck={false} style={{ fontFamily: "monospace", whiteSpace: "pre" }} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} onBlur={handleBlur} />
			{error && <div class="json-error">{error}</div>}
		</div>
	);
}

export const InputComponents: Record<string, ComponentType<InputProps>> = {
	checkbox: CheckboxInput,
	textfield: TextFieldInput,
	dropdown: DropdownInput,
	"dropdown-multiselect": MultiSelectInput,
	file: FileInput,
	list: ListInput,
	dictionary: DictionaryInput,
	json: JsonInput,
};
