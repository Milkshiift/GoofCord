import type { BrowserWindow } from "electron";
import { getConfigDynamic, setConfigDynamic } from "../config.ts";

type NumberPair = [number, number];
type WindowState = [boolean, NumberPair];

export function adjustWindow(window: BrowserWindow, configEntry: string) {
	const previousWindowState = getConfigDynamic(configEntry) as WindowState;
	const [osMaximized, [width, height]] = previousWindowState;
	window.setSize(width, height);
	if (osMaximized) window.maximize();

	const debouncedSaveState = debounce(async () => await saveState(window, configEntry), 500);

	for (const event of ["resize", "maximize", "unmaximize"]) {
		// @ts-ignore
		window.on(event, debouncedSaveState);
	}
}

export async function saveState(window: BrowserWindow, configEntry: string) {
	const previousWindowState = getConfigDynamic(configEntry) as WindowState;

	const isMaximized = window.isMaximized();
	let size: NumberPair;
	if (isMaximized) {
		size = previousWindowState[1];
	} else {
		size = window.getSize() as NumberPair;
	}

	const windowState: [boolean, [number, number]] = [isMaximized, size];
	await setConfigDynamic(configEntry, windowState);
}

function debounce<T extends (...args: Parameters<T>) => void>(func: T, timeout = 300) {
	let timer: NodeJS.Timeout;
	return (...args: Parameters<T>): void => {
		clearTimeout(timer);
		timer = setTimeout(() => func(...args), timeout);
	};
}
