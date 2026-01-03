import { initKeybinds } from "@root/src/windows/main/renderer/postVencord/keybinds.ts";
import { initDynamicIcon } from "./dynamicIcon.ts";
import { updateInvidiousInstance } from "./invidiousEmbeds.ts";
import { initMessageEncryption } from "./messageEncryption.ts";
import { initQuickCssFix } from "./quickCssFix.ts";
import { initRichPresence } from "./richPresence.ts";
import { patchScreenshare } from "./screensharePatch.ts";
import { initSettingsButton } from "./settings.ts";

Object.defineProperties(window, {
	GoofCord: { get: () => window.goofcord },
	VC: { get: () => window.Vencord },
	Common: { get: () => window.Vencord?.Webpack?.Common },
});

function runSafe(tasks: (() => void)[]) {
	for (const fn of tasks) {
		try {
			fn();
		} catch (e) {
			console.error(e);
		}
	}
}

async function init() {
	runSafe([updateInvidiousInstance, initRichPresence]);

	await VC.Webpack.onceReady;

	runSafe([initDynamicIcon, patchScreenshare, initSettingsButton, initMessageEncryption, initQuickCssFix, initKeybinds]);
}

void init();
