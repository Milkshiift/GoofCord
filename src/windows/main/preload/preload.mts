import "./bridge.ts";
import { ipcRenderer, webFrame } from "electron";
// @ts-expect-error
import rendererScript from "../../../../ts-out/windows/main/renderer/renderer.js" with { type: "text" };
import { sendSync } from "../../../ipc/client.ts";
import { error, log } from "../../../modules/logger.ts";
// @ts-expect-error
import discordCss from "./discord.css" with { type: "text" };
import { startKeybindWatcher } from "./keybinds.ts";
import { injectFlashbar } from "./titlebarFlash.ts";
import { patchVencord } from "./vencordPatcher.ts";

if (document.location.hostname.includes("discord")) {
	const assets: Record<string, string[][]> = sendSync("assetLoader:getAssets");
	assets.scripts.unshift(["Renderer", rendererScript]);
	for (const script of assets.scripts) {
		if (script[1].substring(0, 200).toLowerCase().includes("vencord")) {
			script[1] = patchVencord(script[1]);
		}
		webFrame.executeJavaScript(script[1]).then(() => log(`Loaded script: ${script[0]}`));
	}

	void injectFlashbar();

	startKeybindWatcher();

	document.addEventListener("DOMContentLoaded", () => {
		assets.styles.push(["discord.css", discordCss]);

		if (sendSync("config:getConfig", "renderingOptimizations")) {
			assets.styles.push([
				"renderingOptimizations",
				`
				[class*="messagesWrapper"], #channels, #emoji-picker-grid, [class*="members_"] {
				     will-change: transform, scroll-position;
				     contain: strict;
				}
			`,
			]);
		}
		for (const style of assets.styles) {
			updateStyle(style[1], style[0]);
			log(`Loaded style: ${style[0]}`);
		}

		ipcRenderer.on("assetLoader:styleUpdate", (_, data) => {
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

	const styleElement = document.createElement("style");
	styleElement.textContent = style;
	styleElement.id = id;
	document.body.appendChild(styleElement);
	loadedStyles.set(id, styleElement);
}

if (sendSync("config:getConfig", "disableAltMenu")) {
	// https://github.com/electron/electron/issues/34211
	window.addEventListener("keydown", (e) => {
		if (e.code === "AltLeft") e.preventDefault();
	});
}
