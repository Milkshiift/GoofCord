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

async function init() {
	void updateInvidiousInstance();
	initRichPresence();

	await VC.Webpack.onceReady;

	initDynamicIcon();
	patchScreenshare();
	initSettingsButton();
	initMessageEncryption();
	initQuickCssFix();
}

void init();
