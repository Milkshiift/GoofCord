import { initDynamicIcon } from "./dynamicIcon.ts";
import { patchScreenshare } from "./screensharePatch.ts";

async function init() {
    await window.Vencord.Webpack.onceReady;

    initDynamicIcon();
    patchScreenshare();
}

void init();