import { i } from "@root/src/stores/localization/localization.preload.ts";
import type { JSX } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { type ConfigKey, type HiddenEntry, isEditableSetting, type SettingEntry } from "../../../settingsSchema.ts";
import { decrypt, getConfig, saveSetting, subscribe } from "./config.ts";
import { InputComponents } from "./inputs.tsx";

interface SettingFieldProps {
	settingKey: ConfigKey;
	entry: SettingEntry | HiddenEntry;
	forceVisible?: boolean;
}

export function SettingField({ settingKey, entry, forceVisible = false }: SettingFieldProps): JSX.Element {
	const isEditable = isEditableSetting(entry);

	// Get initial value, decrypting if needed
	const getInitialValue = useCallback(() => {
		let val = getConfig(settingKey);
		if (isEditable && entry.encrypted) {
			val = decrypt(val);
		}
		return val;
	}, [settingKey, isEditable, entry]);

	const [value, setValue] = useState(getInitialValue);

	// Visibility state
	const [visible, setVisible] = useState(() => {
		if (forceVisible) return true;
		if (!isEditable) return false;
		if (!entry.showAfter) return true;
		return entry.showAfter.condition(getConfig(entry.showAfter.key as ConfigKey));
	});

	// Subscribe to controller changes for visibility
	useEffect(() => {
		if (forceVisible || !isEditable || !entry.showAfter) return;

		const controllerKey = entry.showAfter.key;
		const condition = entry.showAfter.condition;

		return subscribe(controllerKey, () => {
			const controllerValue = getConfig(controllerKey as ConfigKey);
			setVisible(condition(controllerValue));
		});
	}, [forceVisible, isEditable, entry]);

	useEffect(() => {
		if (forceVisible) setVisible(true);
	}, [forceVisible]);

	const handleChange = useCallback(
		async (newValue: unknown) => {
			setValue(newValue as typeof value);
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

		setValue(entry.defaultValue as typeof value);
		await saveSetting(settingKey, entry.defaultValue, isEditable ? entry : null);
	}, [settingKey, entry, isEditable]);

	if (!visible) {
		return <fieldset class="hidden" data-setting-key={settingKey} />;
	}

	const isOffset = isEditable && entry.showAfter && entry.showAfter.key !== settingKey;
	const name = isEditable && entry.name ? (i(`opt-${settingKey}`) ?? settingKey) : settingKey;
	const description = i(`opt-${settingKey}-desc`) ?? entry.description ?? "";

	const inputType = isEditable ? entry.inputType : "json";
	const InputComponent = InputComponents[inputType];

	if (!InputComponent) {
		console.warn(`No input component for type: ${inputType}`);
		return <fieldset data-setting-key={settingKey} />;
	}

	return (
		<fieldset class={isOffset ? "offset" : ""} data-setting-key={settingKey}>
			<div class="checkbox-container">
				<button type="button" class="revert-button" title="Revert to default value" onClick={handleRevert} />
				<InputComponent id={settingKey} value={value} onChange={handleChange} entry={isEditable ? entry : null} />
				<label for={settingKey}>{name}</label>
			</div>
			{description && <p class="description" dangerouslySetInnerHTML={{ __html: description }} />}
		</fieldset>
	);
}
