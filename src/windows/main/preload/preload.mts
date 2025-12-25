import "./bridge.ts";
import { sendSync } from "../../../ipc/client.ts";
import { startKeybindWatcher } from "./keybinds.ts";
import { injectFlashbar } from "./titlebarFlash.ts";
import { loadScripts, loadStyles } from "./assets.ts";
import { log } from "../../../modules/logger.ts";

const preloadStart = performance.now();

function init() {
	if (!document.location.hostname.includes("discord")) return;

	loadScripts();
	loadStyles();

	// Make sure it's not a popout
	if (!document.location.href.includes("/app")) return;

	measureDiscordStartup();
	injectFlashbar();
	startKeybindWatcher();
}

function measureDiscordStartup() {
	const observer = new MutationObserver((_mutations, obs) => {
		const guildList = document.querySelector('nav[class*="guilds"]');

		if (guildList) {
			const duration = performance.now() - preloadStart;
			log(`Discord Interactive in: ${duration.toFixed(2)}ms`);
			obs.disconnect();
		}
	});

	observer.observe(document, {
		childList: true,
		subtree: true,
	});
}

init();

if (sendSync("config:getConfig", "disableAltMenu")) {
	// https://github.com/electron/electron/issues/34211
	window.addEventListener("keydown", (e) => {
		if (e.code === "AltLeft") e.preventDefault();
	});
}
