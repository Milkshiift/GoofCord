import { getConfig } from "@root/src/stores/config/config.preload.ts";
import { ipcRenderer, webFrame } from "electron";
import { sendSync } from "../../../ipc/client.preload.ts";
import { error, log } from "../../../modules/logger.preload.ts";
import { setVencordPresent } from "./bridge.ts";
// @ts-expect-error
import discordCss from "./discord.css" with { type: "text" };
import { patchVencord } from "./vencordPatcher.ts";

const assets = sendSync("assetLoader:getAssets");

export function loadScripts() {
	const { pre, vencord, post, others } = assets.scripts;

	if (vencord) setVencordPresent(true);

	if (pre) {
		const [name, content] = pre;
		webFrame.executeJavaScript(content)
			.then(() => log(`Loaded Pre-Vencord: ${name}`))
			.catch(err => error(`Failed Pre-Vencord: ${err}`));
	}

	if (vencord) {
		const [name, content] = vencord;

		try {
			const patchedContent = patchVencord(content);

			webFrame.executeJavaScript(patchedContent)
				.then(() => log(`Loaded Vencord: ${name}`))
				.catch(err => error(`Fatal: Vencord failed to load: ${err}`));
		} catch (patchErr) {
			error(`Failed to patch Vencord: ${patchErr}`);
		}

		// Everything in post relies on Vencord, so only load if Vencord is present
		if (post) {
			const [name, content] = post;
			webFrame.executeJavaScript(content)
				.then(() => log(`Loaded Post-Vencord: ${name}`))
				.catch(err => error(`Failed Post-Vencord: ${err}`));
		}
	}

	for (const [name, content] of others) {
		webFrame.executeJavaScript(content)
			.then(() => log(`Loaded Script: ${name}`))
			.catch(err => error(`Failed Script ${name}: ${err}`));
	}
}

const loadedStyles = new Map<string, HTMLStyleElement>();
export function loadStyles() {
	document.addEventListener(
		"DOMContentLoaded",
		() => {
			assets.styles.push(["discord.css", discordCss]);

			if (getConfig("renderingOptimizations")) {
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
		},
		{ once: true },
	);
}

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
