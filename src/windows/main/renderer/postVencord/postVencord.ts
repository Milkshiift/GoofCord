import { initDynamicIcon } from "./dynamicIcon.ts";
import { initMessageEncryption } from "./messageEncryption.ts";
import { initRichPresence } from "./richPresence.ts";
import { patchScreenshare } from "./screensharePatch.ts";
import { initSettingsButton } from "./settings.ts";

async function init() {

	initRichPresence();

	await window.Vencord.Webpack.onceReady;

	initDynamicIcon();
	patchScreenshare();
	initSettingsButton();
	initMessageEncryption();
}

void init();
