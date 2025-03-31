import "./bridge.ts";
import fs from "node:fs";
import { ipcRenderer, webFrame } from "electron";
import { log } from "../../modules/logger.ts";
import { injectTitlebar } from "./titlebar.ts";
import { getDefaultScripts } from "./defaultAssets.ts";

if (document.location.hostname.includes("discord")) {
	void injectTitlebar();

	const assets: Record<string, string[][]> = ipcRenderer.sendSync("assetLoader:getAssets");
	assets.scripts.push(...getDefaultScripts());
	for (const script of assets.scripts) {
		webFrame.executeJavaScript(script[1]).then(() => log(`Loaded script: ${script[0]}`));
	}

	window.localStorage.setItem("hideNag", "true"); // Hide "Download Discord Desktop now!" banner

	assets.styles.push(["discord.css", fs.readFileSync(ipcRenderer.sendSync("utils:getAsset", "css/discord.css"), "utf8")]);
	for (const style of assets.styles) {
		webFrame.insertCSS(style[1]);
		log(`Loaded style: ${style[0]}`);
	}
}