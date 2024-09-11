import type { BrowserWindow } from "electron";
import { getConfigDynamic, setConfigDynamic } from "../config";

type NumberPair = [number, number];
type WindowState = [boolean, NumberPair, NumberPair];

export function adjustWindow(window: BrowserWindow, configEntry: string) {
	const previousWindowState = getConfigDynamic(configEntry) as WindowState;
	const [osMaximized, [x, y], [width, height]] = previousWindowState;
	window.setPosition(x, y);
	window.setSize(width, height);
	if (osMaximized) window.maximize();

	window.on("close", async (_) => await saveState(window, configEntry));
}

export async function saveState(window: BrowserWindow, configEntry: string) {
	const previousWindowState = getConfigDynamic(configEntry) as WindowState;

	const isMaximized = window.isMaximized();
	let position: NumberPair;
	let size: NumberPair;
	if (isMaximized) {
		position = previousWindowState[1];
		size = previousWindowState[2];
	} else {
		position = window.getPosition() as NumberPair;
		size = window.getSize() as NumberPair;
	}

	const windowState: WindowState = [isMaximized, position, size];
	await setConfigDynamic(configEntry, windowState);
}
