import "./bridge.ts";
import { getConfig, whenConfigReady } from "@root/src/stores/config/config.preload.ts";
import { log } from "../../../modules/logger.preload.ts";
import { loadScripts, loadStyles } from "./assets.ts";
import { startKeybindWatcher } from "./keybinds.ts";
import { injectFlashbar } from "./titlebarFlash.ts";

const preloadStart = performance.now();

function init() {
	if (!document.location.href.includes("discord.com/app")) return;

	loadScripts();
	loadStyles();

	measureDiscordStartup();
	injectFlashbar();
	startKeybindWatcher();
	disableAltMenu();
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

function disableAltMenu() {
	if (getConfig("disableAltMenu")) {
		// https://github.com/electron/electron/issues/34211
		window.addEventListener("keydown", (e) => {
			if (e.code === "AltLeft") e.preventDefault();
		});
	}
}

whenConfigReady().then(init);
