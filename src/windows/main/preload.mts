import "./bridge.ts";
import { ipcRenderer, webFrame } from "electron";
import { error, log } from "../../modules/logger.ts";
import { getDefaultScripts } from "./defaultScripts.ts";
import { injectTitlebar } from "./titlebar.ts";
import "./screenshare.ts";
import { startKeybindWatcher } from "./keybinds.ts";
// @ts-ignore
import discordCss from "../../../assets/css/discord.css" with { type: "text" };

if (document.location.hostname.includes("discord")) {
	void injectTitlebar();

	const assets: Record<string, string[][]> = ipcRenderer.sendSync("assetLoader:getAssets");
	assets.scripts.push(...getDefaultScripts());
	for (const script of assets.scripts) {
		webFrame.executeJavaScript(script[1]).then(() => log(`Loaded script: ${script[0]}`));
	}

	startKeybindWatcher();

	document.addEventListener("DOMContentLoaded", () => {
		assets.styles.push(["discord.css", discordCss]);
		if (ipcRenderer.sendSync("config:getConfig", "renderingOptimizations")) {
			assets.styles.push(["renderingOptimizations", `
				[class*="messagesWrapper"], #channels, #emoji-picker-grid, [class*="members_"] {
				     will-change: transform, scroll-position;
				     contain: strict;
				}
			`]);
		}
		for (const style of assets.styles) {
			updateStyle(style[1], style[0]);
			log(`Loaded style: ${style[0]}`);
		}

		ipcRenderer.on('assetLoader:styleUpdate', (_, data) => {
			const { file, content } = data;
			updateStyle(content, file);
			log(`Hot reloaded style: ${file}`);
		});
	});
}

const loadedStyles = new Map<string, HTMLStyleElement>();
function updateStyle(style: string, id: string) {
	try {
		const oldStyleElement = loadedStyles.get(id);
		oldStyleElement?.remove();
	} catch (err) {
		error(`Error removing old style: ${id} - ${err}`);
	}

	const styleElement = document.createElement('style');
	styleElement.textContent = style;
	styleElement.id = id;
	document.body.appendChild(styleElement);
	loadedStyles.set(id, styleElement);
}

if (ipcRenderer.sendSync("config:getConfig", "disableAltMenu")) {
	// https://github.com/electron/electron/issues/34211
	window.addEventListener('keydown', (e) => {
		if (e.code === 'AltLeft') e.preventDefault();
	});
}