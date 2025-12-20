import type { BrowserWindow } from "electron";
import { getConfig, setConfig } from "../config.ts";
import type { ConfigKey } from "../settingsSchema.ts";

type NumberPair = [number, number];
type WindowState = [boolean, NumberPair];

export function adjustWindow(window: BrowserWindow, configEntry: string) {
	const previousWindowState = getConfig(configEntry as ConfigKey) as WindowState;
	const [osMaximized, [width, height]] = previousWindowState;
	window.setSize(width, height);
	if (osMaximized) window.maximize();

	const debouncedSaveState = debounce(async () => await saveState(window, configEntry), 1000);

	for (const event of ["resize", "maximize", "unmaximize"]) {
		// @ts-expect-error
		window.on(event, debouncedSaveState);
	}
}

export async function saveState(window: BrowserWindow, configEntry: string) {
	const previousWindowState = getConfig(configEntry as ConfigKey) as WindowState;

	const isMaximized = window.isMaximized();
	let size: NumberPair;
	if (isMaximized) {
		size = previousWindowState[1];
	} else {
		size = window.getSize() as NumberPair;
	}

	const windowState: [boolean, [number, number]] = [isMaximized, size];
	await setConfig(configEntry as ConfigKey, windowState);
}

function debounce<T extends (...args: Parameters<T>) => void>(func: T, timeout = 300) {
	let timer: Timer;
	return (...args: Parameters<T>): void => {
		clearTimeout(timer);
		timer = setTimeout(() => func(...args), timeout);
	};
}
