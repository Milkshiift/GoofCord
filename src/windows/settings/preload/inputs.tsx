import { i } from "@root/src/stores/localization/localization.preload.ts";
import type { ComponentType, JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

import { invoke } from "../../../ipc/client.preload.ts";
import type { SettingEntry } from "../../../settingsSchema.ts";
import { MultiSelect } from "./MultiSelect.tsx";

export interface InputProps {
	id: string;
	value: unknown;
	onChange: (value: unknown) => void;
	entry: SettingEntry | null;
}

function toStringValue(val: unknown): string {
	if (typeof val === "string") return val;
	if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") {
		return String(val);
	}
	return "";
}

function CheckboxInput({ id, value, onChange }: InputProps): JSX.Element {
	return <input type="checkbox" id={id} setting-name={id} checked={Boolean(value)} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />;
}

// Buffered TextField to eliminate IPC keystroke lag
function TextFieldInput({ id, value, onChange }: InputProps): JSX.Element {
	const stringValue = toStringValue(value);
	const [localValue, setLocalValue] = useState(stringValue);

	useEffect(() => {
		setLocalValue(toStringValue(value));
	}, [value]);

	const commit = () => {
		if (localValue !== value) {
			onChange(localValue);
		}
	};

	return (
		<input
			type="text"
			id={id}
			setting-name={id}
			class="text"
			value={localValue}
			onInput={(e) => setLocalValue((e.currentTarget as HTMLInputElement).value)}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					(e.currentTarget as HTMLInputElement).blur();
				}
			}}
		/>
	);
}

function DropdownInput({ id, value, onChange, entry }: InputProps): JSX.Element {
	const options = useMemo(() => {
		if (!entry?.options) return [];
		return Array.isArray(entry.options) ? entry.options : Object.keys(entry.options);
	}, [entry?.options]);

	return (
		<select id={id} setting-name={id} class="left dropdown" value={toStringValue(value)} onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}>
			{options.map((opt) => {
				const strOpt = String(opt);
				return (
					<option key={strOpt} value={strOpt}>
						{strOpt}
					</option>
				);
			})}
		</select>
	);
}

function MultiSelectInput({ id, value, onChange, entry }: InputProps): JSX.Element {
	const options = useMemo(() => {
		if (!entry?.options) return [];
		const raw = Array.isArray(entry.options) ? entry.options : Object.keys(entry.options);
		return raw.map(String);
	}, [entry?.options]);

	const safeValue = Array.isArray(value) ? (value as string[]) : [];

	return <MultiSelect id={id} options={options} value={safeValue} onChange={onChange} />;
}

function FileInput({ id, onChange, entry }: InputProps): JSX.Element {
	const handleChange = async (e: Event) => {
		const target = e.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		try {
			const buffer = await file.arrayBuffer();
			const path = await invoke("utils:saveFileToGCFolder", id, Buffer.from(buffer));
			onChange(path);
		} catch (err) {
			console.error(`Failed to save file for setting "${id}":`, err);
		}
	};

	return <input type="file" id={id} setting-name={id} accept={entry?.accept ?? "*"} onChange={handleChange} />;
}

function ListInput({ id, value, onChange }: InputProps): JSX.Element {
	const items = useMemo(() => (Array.isArray(value) ? (value as string[]) : []), [value]);

	const handleAdd = () => onChange([...items, ""]);

	const handleRemove = (index: number) => {
		onChange(items.filter((_, i) => i !== index));
	};

	const handleItemChange = (index: number, newValue: string) => {
		const updated = items.map((item, i) => (i === index ? newValue : item));
		onChange(updated);
	};

	return (
		<div class="dictionary-container" id={id} setting-name={id}>
			<div class="dictionary-rows">
				{items.map((item, idx) => (
					<div key={idx} class="dictionary-row">
						<input type="text" class="list-value" value={item} onChange={(e) => handleItemChange(idx, (e.currentTarget as HTMLInputElement).value)} />
						<button type="button" class="dictionary-remove-btn" aria-label="Remove item" onClick={() => handleRemove(idx)}>
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
	const dictValue = useMemo(() => {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return value as Record<string, string>;
		}
		return {};
	}, [value]);

	const [entries, setEntries] = useState<[string, string][]>(() => Object.entries(dictValue));
	const entriesRef = useRef(entries);

	useEffect(() => {
		entriesRef.current = entries;
	}, [entries]);

	useEffect(() => {
		const currentObj: Record<string, string> = {};
		for (const [k, v] of entriesRef.current) {
			const trimmed = k.trim();
			if (trimmed) currentObj[trimmed] = v.trim();
		}

		if (JSON.stringify(currentObj) !== JSON.stringify(dictValue)) {
			setEntries(Object.entries(dictValue));
		}
	}, [dictValue]);

	// Track key occurrences for duplicate validation
	const keyCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const [k] of entries) {
			const trimmed = k.trim();
			if (trimmed) {
				counts[trimmed] = (counts[trimmed] || 0) + 1;
			}
		}
		return counts;
	}, [entries]);

	const syncToParent = useCallback(
		(newEntries: [string, string][]) => {
			setEntries(newEntries);

			const counts: Record<string, number> = {};
			let hasEmpty = false;

			for (const [k] of newEntries) {
				const trimmed = k.trim();
				if (!trimmed) {
					hasEmpty = true;
				} else {
					counts[trimmed] = (counts[trimmed] || 0) + 1;
				}
			}

			const hasDuplicates = Object.values(counts).some((count) => count > 1);

			// Only persist valid, non-colliding entries
			if (!hasDuplicates && !hasEmpty) {
				const obj: Record<string, string> = {};
				for (const [k, v] of newEntries) {
					obj[k.trim()] = v.trim();
				}
				onChange(obj);
			}
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
		const updated = entries.map((e, i): [string, string] => (i === index ? [newKey, e[1]] : e));
		syncToParent(updated);
	};

	const handleValueChange = (index: number, newValue: string) => {
		const updated = entries.map((e, i): [string, string] => (i === index ? [e[0], newValue] : e));
		syncToParent(updated);
	};

	const handlePresetChange = (e: Event) => {
		const select = e.currentTarget as HTMLSelectElement;
		const option = select.selectedOptions[0];
		const key = select.value === "$$empty$$" ? "" : select.value;
		const val = option?.dataset.val ?? "";
		select.selectedIndex = 0;
		handleAdd(key, val);
	};

	const presets = useMemo(() => {
		return (Array.isArray(entry?.options) ? entry.options : []) as Array<string | [string, string]>;
	}, [entry?.options]);

	return (
		<div class="dictionary-container" id={id} setting-name={id}>
			<div class="dictionary-rows">
				{entries.map(([k, v], idx) => {
					const trimmed = k.trim();
					const isEmpty = !trimmed;
					const isDuplicate = trimmed ? (keyCounts[trimmed] ?? 0) > 1 : false;
					const hasError = isEmpty || isDuplicate;

					return (
						<div key={idx} class="dictionary-row">
							<input
								type="text"
								class={`dict-key${hasError ? " input-error" : ""}`}
								placeholder={i("settings-dictionary-key")}
								value={k}
								title={isDuplicate ? i("settings-dictionary-duplicate-key") : isEmpty ? i("settings-dictionary-empty-key") : undefined}
								onChange={(e) => handleKeyChange(idx, (e.currentTarget as HTMLInputElement).value)}
							/>
							<input type="text" class="dict-value" placeholder={i("settings-dictionary-value")} value={v} onChange={(e) => handleValueChange(idx, (e.currentTarget as HTMLInputElement).value)} />
							<button type="button" class="dictionary-remove-btn" aria-label="Remove entry" onClick={() => handleRemove(idx)}>
								✕
							</button>
						</div>
					);
				})}
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
	const formatValue = (val: unknown): string => {
		if (typeof val === "string") return val;
		const str = JSON.stringify(val, null, "\t");
		return str !== undefined ? str : "";
	};

	const [text, setText] = useState(() => formatValue(value));
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setText(formatValue(value));
		setError(null);
	}, [value]);

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
			<textarea id={id} setting-name={id} class="code-font" spellcheck={false} style={{ fontFamily: "monospace", whiteSpace: "pre" }} value={text} onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)} onBlur={handleBlur} />
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
