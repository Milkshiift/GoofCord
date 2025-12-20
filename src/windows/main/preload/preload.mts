import "./bridge.ts";
import { sendSync } from "../../../ipc/client.ts";
import { startKeybindWatcher } from "./keybinds.ts";
import { injectFlashbar } from "./titlebarFlash.ts";
import { loadScripts, loadStyles } from "./assets.ts";

function init() {
	if (!document.location.hostname.includes("discord")) return;

	loadScripts();

	void injectFlashbar();
	startKeybindWatcher();

	document.addEventListener("DOMContentLoaded", () => {
		loadStyles();
	});
}
init();

if (sendSync("config:getConfig", "disableAltMenu")) {
	// https://github.com/electron/electron/issues/34211
	window.addEventListener("keydown", (e) => {
		if (e.code === "AltLeft") e.preventDefault();
	});
}
