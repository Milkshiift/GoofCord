import { initDynamicIcon } from "./dynamicIcon.ts";
import { patchScreenshare } from "./screensharePatch.ts";
import { initSettingsButton } from "./settings.tsx";

async function init() {
    await window.Vencord.Webpack.onceReady;

    initDynamicIcon();
    patchScreenshare();
    initSettingsButton();
}

void init();