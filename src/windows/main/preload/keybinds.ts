import { contextBridge, ipcRenderer } from "electron";

import { invoke } from "../../../ipc/client.preload.ts";
import { warn } from "../../../modules/logger.preload.ts";
import {type Keybind} from "goofbind";

const getActiveKeybinds = (): Map<string, Keybind> => {
	const activeKeybinds = new Map<string, Keybind>();
	const keybindsRaw = window.localStorage.getItem("keybinds");

	if (!keybindsRaw) return activeKeybinds;

	const keybinds = JSON.parse(keybindsRaw)?._state;
	if (!keybinds) return activeKeybinds;

	const MODIFIERS = {
		CTRL: 17,
		ALT: 18,
		SHIFT: 16,
		META: 91
	};

	for (const bind in keybinds) {
		const binding = keybinds[bind];

		// We are only interested in user defined keybinds
		if (binding.managed === true || binding.enabled === false) continue;

		const keys = binding.shortcut.map((x: number[]) => x[1]);

		// Filter out modifier keys
		const mainKeys = keys.filter((key: number) => ![MODIFIERS.CTRL, MODIFIERS.ALT, MODIFIERS.SHIFT, MODIFIERS.META].includes(key));
		const mainKey = mainKeys.length > 0 ? mainKeys.at(-1) : "";

		if (!mainKey) continue;

		activeKeybinds.set(binding.action, {
			id: binding.action,
			name: macroCaseToTitleCase(binding.action),
			keycode: mainKey,
			ctrl: keys.includes(MODIFIERS.CTRL),
			alt: keys.includes(MODIFIERS.ALT),
			shift: keys.includes(MODIFIERS.SHIFT),
			meta: keys.includes(MODIFIERS.META)
		});
	}

	return activeKeybinds;
};

// HELLO_WORLD -> Hello World
const macroCaseToTitleCase = (input: string): string => {
	return input
		.toLowerCase()
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

let activeKeybinds: Map<string, Keybind> = getActiveKeybinds();

function updateKeybinds() {
	activeKeybinds = getActiveKeybinds();
	const toSend = activeKeybinds.values().toArray();

	console.log(toSend);
	void invoke("goofbind:setKeybinds", toSend);
}

export const KeybindApi = {
	updateKeybinds: debounce(updateKeybinds, 1000),
};

export function startKeybindWatcher() {
	updateKeybinds();

	// See postVencord/keybinds.ts
	contextBridge.exposeInMainWorld("keybinds", KeybindApi);
}

ipcRenderer.on("keybinds:getAll", () => {
	return activeKeybinds;
});

ipcRenderer.on("keybinds:trigger", (_, id, keyup) => {
	const keybind = activeKeybinds.get(id);
	if (!keybind) {
		warn("Keybind not found: " + id);
		return;
	}

	const event = new KeyboardEvent(keyup ? "keyup" : "keydown", {
		keyCode: keybind.keycode,
		shiftKey: keybind.shift,
		ctrlKey: keybind.ctrl,
		altKey: keybind.alt,
		metaKey: keybind.meta
	});

	document.dispatchEvent(event);
});

function debounce<T extends (...args: Parameters<T>) => void>(func: T, timeout = 300) {
	let timer: Timer;
	return (...args: Parameters<T>): void => {
		clearTimeout(timer);
		timer = setTimeout(() => func(...args), timeout);
	};
}
