import "./bridge.ts";
import fs from "node:fs";
import { ipcRenderer, webFrame } from "electron";
import { log } from "../../modules/logger.ts";
import { injectTitlebar } from "./titlebar.ts";
import { getDefaultScripts } from "./defaultAssets.ts";

const loadedStyles = new Map<string, string>();

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
		const styleId = webFrame.insertCSS(style[1]);
		loadedStyles.set(style[0], styleId);
		log(`Loaded style: ${style[0]}`);
	}

	ipcRenderer.on('assetLoader:styleUpdate', (_, data) => {
		const { file, content } = data;

		if (loadedStyles.has(file)) {
			try {
				webFrame.removeInsertedCSS(loadedStyles.get(file)!);
			} catch (err) {
				log(`Error removing old style: ${file} - ${err}`);
			}
		}

		const styleId = webFrame.insertCSS(content);
		loadedStyles.set(file, styleId);
		log(`Hot reloaded style: ${file}`);
	});
}