import { createClient, type StoreClient } from "electron-sync-store/preload";

const locClient: StoreClient<Record<string, string>> = createClient("localization");

export const whenLocalizationReady = () => locClient.ready();

export function i(key: string): string {
	return locClient.get()[key] ?? key;
}
