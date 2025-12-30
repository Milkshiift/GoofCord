import { ipcRenderer } from "electron";

export function createHydrator<T>(channelPrefix: string) {
	let cache: T | null = null;

	const ensureInitialized = () => {
		if (cache) return;
		cache = ipcRenderer.sendSync(`${channelPrefix}:sync`);
	};

	ipcRenderer.on(`${channelPrefix}:update`, (_e, data: T) => {
		cache = data;
	});

	return {
		get: (): T => {
			ensureInitialized();
			// biome-ignore lint/style/noNonNullAssertion: We know we initialized
			return cache!;
		},
		forceSet: (data: T) => {
			cache = data;
		},
	};
}
