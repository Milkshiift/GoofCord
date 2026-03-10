import { contextBridge, ipcRenderer } from "electron";

import { invoke } from "../../../ipc/client.preload.ts";
import { warn } from "../../../modules/logger.preload.ts";

// Types

interface EventSettings {
	key: string;
	code: string;
	keyCode: number;
	which: number;
	location: number; // 0 = Standard, 3 = Numpad
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
}

interface Keybind {
	shortcut: string;
	eventSettings: EventSettings;
	mouseButton?: number;
}

// Maps mouse button index to the MouseEvent.buttons bitmask
const MOUSE_BUTTON_BITMASK: Record<number, number> = {
	0: 1, // left
	1: 4, // middle
	2: 2, // right
	3: 8, // back (Mouse 4)
	4: 16, // forward (Mouse 5)
};

interface RawBinding {
	managed?: boolean;
	enabled?: boolean;
	action: string;
	shortcut: [number, number][];
}

interface ParsedKeybindState {
	_state?: Record<string, RawBinding>;
}

// Constants

const MODIFIERS = {
	SHIFT: 16,
	CTRL: 17,
	ALT: 18,
	META_LEFT: 91,
	META_RIGHT: 92,
	META_MAC: 93,
};
const MODIFIER_VALUES = Object.values(MODIFIERS);

// Helpers

const getEventProfile = (keyCode: number): { key: string; code: string; location?: number } => {
	// A-Z
	if (keyCode >= 65 && keyCode <= 90) {
		const char = String.fromCharCode(keyCode);
		return { key: char.toLowerCase(), code: `Key${char}`, location: 0 };
	}
	// 0-9 (Standard Row)
	if (keyCode >= 48 && keyCode <= 57) {
		const digit = String.fromCharCode(keyCode);
		return { key: digit, code: `Digit${digit}`, location: 0 };
	}
	// Function keys (F1 - F24)
	if (keyCode >= 112 && keyCode <= 135) {
		const fNum = keyCode - 111;
		return { key: `F${fNum}`, code: `F${fNum}`, location: 0 };
	}
	// Numpad Numbers (0-9)
	if (keyCode >= 96 && keyCode <= 105) {
		const nNum = keyCode - 96;
		return { key: `${nNum}`, code: `Numpad${nNum}`, location: 3 }; // Location 3 = Numpad
	}

	const specialKeys: Record<number, { key: string; code: string; location?: number }> = {
		8: { key: "Backspace", code: "Backspace" },
		9: { key: "Tab", code: "Tab" },
		13: { key: "Enter", code: "Enter" },
		27: { key: "Escape", code: "Escape" },
		32: { key: " ", code: "Space" },
		33: { key: "PageUp", code: "PageUp" },
		34: { key: "PageDown", code: "PageDown" },
		35: { key: "End", code: "End" },
		36: { key: "Home", code: "Home" },
		37: { key: "ArrowLeft", code: "ArrowLeft" },
		38: { key: "ArrowUp", code: "ArrowUp" },
		39: { key: "ArrowRight", code: "ArrowRight" },
		40: { key: "ArrowDown", code: "ArrowDown" },
		45: { key: "Insert", code: "Insert" },
		46: { key: "Delete", code: "Delete" },

		// Numpad Operators
		106: { key: "*", code: "NumpadMultiply", location: 3 },
		107: { key: "+", code: "NumpadAdd", location: 3 },
		109: { key: "-", code: "NumpadSubtract", location: 3 },
		110: { key: ".", code: "NumpadDecimal", location: 3 },
		111: { key: "/", code: "NumpadDivide", location: 3 },

		// Punctuation
		186: { key: ";", code: "Semicolon" },
		187: { key: "=", code: "Equal" },
		188: { key: ",", code: "Comma" },
		189: { key: "-", code: "Minus" },
		190: { key: ".", code: "Period" },
		191: { key: "/", code: "Slash" },
		192: { key: "`", code: "Backquote" },
		219: { key: "[", code: "BracketLeft" },
		220: { key: "\\", code: "Backslash" },
		221: { key: "]", code: "BracketRight" },
		222: { key: "'", code: "Quote" },
	};

	return specialKeys[keyCode] || { key: "Unidentified", code: "Unidentified", location: 0 };
};

function debounce<T extends (...args: Parameters<T>) => void>(func: T, timeout = 300) {
	let timer: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>): void => {
		clearTimeout(timer);
		timer = setTimeout(() => func(...args), timeout);
	};
}

// Main Logic

const getActiveKeybinds = (): Map<string, Keybind> => {
	const activeKeybinds = new Map<string, Keybind>();
	const keybindsRaw = window.localStorage.getItem("keybinds");

	if (!keybindsRaw) return activeKeybinds;

	let parsedData: ParsedKeybindState;
	try {
		parsedData = JSON.parse(keybindsRaw);
	} catch (e) {
		warn("Failed to parse keybinds from localStorage");
		return activeKeybinds;
	}

	const keybinds = parsedData?._state;
	if (!keybinds) return activeKeybinds;

	for (const binding of Object.values(keybinds)) {
		// Only process user-defined, enabled keybinds
		if (binding.managed || binding.enabled === false || !binding.shortcut) continue;

		// x[0] is the input type: 0 = keyboard, 1 = mouse button
		const keyboardInputs = binding.shortcut.filter((x) => x[0] === 0).map((x) => x[1]);
		const mouseButtons = binding.shortcut.filter((x) => x[0] === 1).map((x) => x[1]);

		const modifiers = {
			ctrl: keyboardInputs.includes(MODIFIERS.CTRL),
			alt: keyboardInputs.includes(MODIFIERS.ALT),
			shift: keyboardInputs.includes(MODIFIERS.SHIFT),
			meta: keyboardInputs.some((k) => k === MODIFIERS.META_LEFT || k === MODIFIERS.META_RIGHT || k === MODIFIERS.META_MAC),
		};

		if (mouseButtons.length > 0) {
			// Mouse button keybind — venbind cannot capture these globally.
			// Store with mouseButton so the trigger handler dispatches a MouseEvent.
			const primaryMouseButton = mouseButtons[mouseButtons.length - 1];
			activeKeybinds.set(binding.action, {
				shortcut: "",
				mouseButton: primaryMouseButton,
				eventSettings: {
					key: "",
					code: "",
					keyCode: 0,
					which: 0,
					location: 0,
					ctrlKey: modifiers.ctrl,
					altKey: modifiers.alt,
					shiftKey: modifiers.shift,
					metaKey: modifiers.meta,
				},
			});
			continue;
		}

		// Isolate the primary keyboard keys (non-modifiers)
		const mainKeys = keyboardInputs.filter((key) => !MODIFIER_VALUES.includes(key));
		const primaryKeyCode = mainKeys.length > 0 ? mainKeys[mainKeys.length - 1] : null;

		if (!primaryKeyCode) continue;

		const profile = getEventProfile(primaryKeyCode);

		const keyParts: string[] = [];
		if (modifiers.ctrl) keyParts.push("ctrl");
		if (modifiers.alt) keyParts.push("alt");
		if (modifiers.shift) keyParts.push("shift");
		if (modifiers.meta) keyParts.push("meta");
		keyParts.push(profile.key);

		activeKeybinds.set(binding.action, {
			shortcut: keyParts.join("+").toLowerCase(),
			eventSettings: {
				key: profile.key,
				code: profile.code,
				keyCode: primaryKeyCode,
				which: primaryKeyCode,
				location: profile.location || 0,
				ctrlKey: modifiers.ctrl,
				altKey: modifiers.alt,
				shiftKey: modifiers.shift,
				metaKey: modifiers.meta,
			},
		});
	}

	return activeKeybinds;
};

// State & Initialization

let activeKeybinds: Map<string, Keybind> = new Map();

function updateKeybinds() {
	activeKeybinds = getActiveKeybinds();

	const toSend = Array.from(activeKeybinds.entries())
		.filter(([, value]) => value.mouseButton === undefined && value.shortcut !== "")
		.map(([key, value]) => ({
			id: key,
			name: key,
			shortcut: value.shortcut,
		}));

	console.log(toSend);
	void invoke("venbind:setKeybinds", toSend);
}

export const KeybindApi = {
	updateKeybinds: debounce(updateKeybinds, 1000),
};

export function startKeybindWatcher() {
	updateKeybinds();
	// See postVencord/keybinds.ts
	contextBridge.exposeInMainWorld("keybinds", KeybindApi);
}

// IPC

ipcRenderer.on("keybinds:trigger", (_, id: string, keyup: boolean) => {
	const keybind = activeKeybinds.get(id);
	if (!keybind) return;

	if (keybind.mouseButton !== undefined) {
		const event = new MouseEvent(keyup ? "mouseup" : "mousedown", {
			button: keybind.mouseButton,
			buttons: keyup ? 0 : (MOUSE_BUTTON_BITMASK[keybind.mouseButton] ?? 0),
			ctrlKey: keybind.eventSettings.ctrlKey,
			altKey: keybind.eventSettings.altKey,
			shiftKey: keybind.eventSettings.shiftKey,
			metaKey: keybind.eventSettings.metaKey,
			bubbles: true,
			cancelable: true,
			composed: true,
		});
		document.dispatchEvent(event);
		return;
	}

	const event = new KeyboardEvent(keyup ? "keyup" : "keydown", {
		...keybind.eventSettings,
		bubbles: true,
		cancelable: true,
		composed: true,
	});

	document.dispatchEvent(event);
});
