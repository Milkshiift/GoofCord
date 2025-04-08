import "./bridge.ts";
import fs from "node:fs";
import { ipcRenderer, webFrame } from "electron";
import { error, log } from "../../modules/logger.ts";
import { injectTitlebar } from "./titlebar.ts";
import { getDefaultScripts } from "./defaultAssets.ts";
import "./patches/screenshare.ts";
import "./patches/keybinds.ts";

const loadedStyles = new Map<string, HTMLStyleElement>();

if (document.location.hostname.includes("discord")) {
	void injectTitlebar();

	const assets: Record<string, string[][]> = ipcRenderer.sendSync("assetLoader:getAssets");
	assets.scripts.push(...getDefaultScripts());
	for (const script of assets.scripts) {
		webFrame.executeJavaScript(script[1]).then(() => log(`Loaded script: ${script[0]}`));
	}

	window.localStorage.setItem("hideNag", "true"); // Hide "Download Discord Desktop now!" banner

	document.addEventListener("DOMContentLoaded", () => {
		assets.styles.push(["discord.css", fs.readFileSync(ipcRenderer.sendSync("utils:getAsset", "css/discord.css"), "utf8")]);
		for (const style of assets.styles) {
			const styleElement = document.createElement('style');
			styleElement.textContent = style[1];
			styleElement.id = style[0];
			document.head.appendChild(styleElement);
			loadedStyles.set(style[0], styleElement);
			log(`Loaded style: ${style[0]}`);
		}

		ipcRenderer.on('assetLoader:styleUpdate', (_, data) => {
			const { file, content } = data;

			if (loadedStyles.has(file)) {
				try {
					const oldStyleElement = loadedStyles.get(file)!;
					oldStyleElement.remove();
				} catch (err) {
					error(`Error removing old style: ${file} - ${err}`);
				}
			}

			const styleElement = document.createElement('style');
			styleElement.textContent = content;
			styleElement.id = file;
			document.head.appendChild(styleElement);
			loadedStyles.set(file, styleElement);
			log(`Hot reloaded style: ${file}`);
		});
	});
}