import { initDynamicIcon } from "./dynamicIcon.ts";
import { initMessageEncryption } from "./messageEncryption.ts";
import { initRichPresence } from "./richPresence.ts";
import { patchScreenshare } from "./screensharePatch.ts";
import { initSettingsButton } from "./settings.ts";

Object.defineProperties(window, {
	GoofCord: { get: () => window.goofcord },
	Vencord: { get: () => window.Vencord },
	Common: { get: () => window.Vencord?.Webpack?.Common },
});

async function init() {

	initRichPresence();

	await Vencord.Webpack.onceReady;

	initDynamicIcon();
	patchScreenshare();
	initSettingsButton();
	initMessageEncryption();
}

void init();
