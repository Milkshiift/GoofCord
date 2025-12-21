import { initDynamicIcon } from "./dynamicIcon.ts";
import { patchScreenshare } from "./screensharePatch.ts";
import { initSettingsButton } from "./settings.ts";
import { initRichPresence } from "./richPresence.ts";

async function init() {
	initRichPresence();

	await window.Vencord.Webpack.onceReady;

	initDynamicIcon();
	patchScreenshare();
	initSettingsButton();
}

void init();
