import type { BrowserWindow, Display } from "electron";

import type { ConfigKey } from "../settingsSchema.ts";
import { getConfig, setConfig } from "../stores/config/config.main.ts";

type NumberPair = [number, number];
type WindowState = [boolean, NumberPair, NumberPair];

function isPositionOnScreen(x: number, y: number): boolean {
	const displays = require("electron").screen.getAllDisplays();
	return displays.some((display: Display) => {
		const { bounds } = display;
		return x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height;
	});
}

export function adjustWindow(window: BrowserWindow, configEntry: ConfigKey) {
	let previousWindowState = getConfig(configEntry) as WindowState;
	const [osMaximized, [x, y], [width, height]] = previousWindowState;

	// Validate window position is on a visible display
	if (!isPositionOnScreen(x, y)) {
		console.log("Saved window position is off-screen, resetting to default");
		previousWindowState = [true, [-1, -1], [835, 600]];
	}

	const [maximized, [posX, posY], [winWidth, winHeight]] = previousWindowState;
	window.setSize(winWidth, winHeight);
	window.setPosition(posX, posY);
	if (maximized) window.maximize();

	const debouncedSaveState = debounce(async () => await saveState(window, configEntry), 1000);

	// Delay to avoid capturing internal events
	setTimeout(() => {
		for (const event of ["resize", "maximize", "unmaximize"]) {
			// @ts-expect-error
			window.on(event, debouncedSaveState);
		}
	}, 1000);
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
