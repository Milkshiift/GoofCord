import { i } from "@root/src/stores/localization/localization.preload.ts";
import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

import { type ConfigKey, type HiddenEntry, isEditableSetting, type SettingEntry } from "../../../settingsSchema.ts";
import { getConfig, saveSetting, subscribe } from "./config.ts";
import { InputComponents } from "./inputs.tsx";

interface SettingFieldProps {
	settingKey: ConfigKey;
	entry: SettingEntry | HiddenEntry;
	forceVisible?: boolean;
}

export function SettingField({ settingKey, entry, forceVisible = false }: SettingFieldProps): JSX.Element {
	const isEditable = isEditableSetting(entry);

	const [value, setValue] = useState(() => getConfig(settingKey));

	const evaluateVisibility = useCallback((): boolean => {
		if (forceVisible) return true;
		if (!isEditable) return false;
		if (!entry.showAfter) return true;
		return Boolean(entry.showAfter.condition(getConfig(entry.showAfter.key as ConfigKey)));
	}, [forceVisible, isEditable, entry]);

	const [visible, setVisible] = useState(evaluateVisibility);

	useEffect(() => {
		if (forceVisible) {
			setVisible(true);
			return;
		}

		if (!isEditable || !entry.showAfter) {
			setVisible(evaluateVisibility());
			return;
		}

		const controllerKey = entry.showAfter.key;
		const condition = entry.showAfter.condition;

		const updateVisibility = () => {
			const controllerValue = getConfig(controllerKey as ConfigKey);
			setVisible(Boolean(condition(controllerValue)));
		};

		updateVisibility();
		return subscribe(controllerKey, updateVisibility);
	}, [forceVisible, isEditable, entry, evaluateVisibility]);

	const handleChange = useCallback(
		async (newValue: unknown) => {
			setValue((prev) => newValue as typeof prev);
			await saveSetting(settingKey, newValue, isEditable ? entry : null);
		},
		[settingKey, isEditable, entry],
	);

	const handleRevert = useCallback(async () => {
		if (entry.defaultValue === undefined) return;

		if (isEditable && entry.inputType === "file") {
			await saveSetting(settingKey, entry.defaultValue, entry);
			setValue("");
			return;
		}

		setValue(() => entry.defaultValue as any);
		await saveSetting(settingKey, entry.defaultValue, isEditable ? entry : null);
	}, [settingKey, entry, isEditable]);

	// Check if current value differs from default
	const isModified = useMemo(() => {
		if (!isEditable || entry.defaultValue === undefined) return false;
		if (typeof value === "object" && value !== null) {
			return JSON.stringify(value) !== JSON.stringify(entry.defaultValue);
		}
		return value !== entry.defaultValue;
	}, [value, entry, isEditable]);

	if (!visible) {
		return <fieldset class="hidden" data-setting-key={settingKey} />;
	}

	const isOffset = isEditable && Boolean(entry.showAfter) && entry.showAfter?.key !== settingKey;
	const name = isEditable && entry.name ? (i(`opt-${settingKey}`) ?? settingKey) : settingKey;
	const description = i(`opt-${settingKey}-desc`) ?? (isEditable ? entry.description : "") ?? "";

	const inputType = isEditable ? entry.inputType : "json";
	const InputComponent = InputComponents[inputType];

	if (!InputComponent) {
		console.warn(`No input component for type: ${inputType}`);
		return <fieldset data-setting-key={settingKey} />;
	}

	return (
		<fieldset class={isOffset ? "offset" : ""} data-setting-key={settingKey}>
			<div class="checkbox-container">
				{isModified && <button type="button" class="revert-button" title={i("settings-revert")} onClick={handleRevert} />}
				<InputComponent id={settingKey} value={value} onChange={handleChange} entry={isEditable ? entry : null} />
				<label for={settingKey}>{name}</label>
			</div>
			{description && <p class="description" dangerouslySetInnerHTML={{ __html: description }} />}
		</fieldset>
	);
}
