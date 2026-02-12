import type { BrowserWindow } from "electron";
import type { ConfigKey } from "../settingsSchema.ts";
import { getConfig, setConfig } from "../stores/config/config.main.ts";

type NumberPair = [number, number];
type WindowState = [boolean, NumberPair, NumberPair];

export function adjustWindow(window: BrowserWindow, configEntry: ConfigKey) {
	const previousWindowState = getConfig(configEntry) as WindowState;
	const [osMaximized, [x, y], [width, height]] = previousWindowState;
	window.setSize(width, height);
	window.setPosition(x, y);
	if (osMaximized) window.maximize();

	const debouncedSaveState = debounce(async () => await saveState(window, configEntry), 1000);

	for (const event of ["resize", "maximize", "unmaximize"]) {
		// @ts-expect-error
		window.on(event, debouncedSaveState);
	}
}

export async function saveState(window: BrowserWindow, configEntry: ConfigKey) {
	const previousWindowState = getConfig(configEntry) as WindowState;

	const isMaximized = window.isMaximized();
	let size: NumberPair;
	let position: NumberPair;
	if (isMaximized) {
		size = previousWindowState[2];
		position = previousWindowState[1];
	} else {
		size = window.getSize() as NumberPair;
		position = window.getPosition() as NumberPair;
	}

	const windowState: WindowState = [isMaximized, position, size];
	await setConfig(configEntry, windowState);
}

function debounce<T extends (...args: Parameters<T>) => void>(func: T, timeout = 300) {
	let timer: Timer;
	return (...args: Parameters<T>): void => {
		clearTimeout(timer);
		timer = setTimeout(() => func(...args), timeout);
	};
}
