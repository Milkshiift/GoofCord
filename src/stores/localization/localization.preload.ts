import { LocalizationStore } from "@root/src/stores/localization/localization.shared.ts";
import { createClient } from "electron-sync-store/preload";

const locClient = createClient(LocalizationStore);

export function i(key: string): string {
	const map = locClient.get();
	return map[key] || key;
}
