import { getConfig } from "@root/src/stores/config/config.preload.ts";
// @ts-expect-error
import postVencordScript from "@root/ts-out/windows/main/renderer/postVencord/postVencord.js" with { type: "text" };
// @ts-expect-error
import preVencordScript from "@root/ts-out/windows/main/renderer/preVencord/preVencord.js" with { type: "text" };
import { ipcRenderer, webFrame } from "electron";
import { sendSync } from "../../../ipc/client.preload.ts";
import { error, log } from "../../../modules/logger.preload.ts";
import { setVencordPresent } from "./bridge.ts";
// @ts-expect-error
import discordCss from "./discord.css" with { type: "text" };
import { patchVencord } from "./vencordPatcher.ts";

const assets = sendSync("assetLoader:getAssets");
const isVencordLoader = (scriptContent: string) => scriptContent.substring(0, 500).toLowerCase().includes("vencord");

export function loadScripts() {
	const vencordIndex = assets.scripts.findIndex(([, content]) => isVencordLoader(content));
	const hasVencord = vencordIndex !== -1;
	if (hasVencord) setVencordPresent(true);

	webFrame.executeJavaScript(preVencordScript).then(() => log(`Loaded pre-Vencord renderer`));

	for (let i = 0; i < assets.scripts.length; i++) {
		const [name, content] = assets.scripts[i];

		if (i === vencordIndex) {
			const patchedContent = patchVencord(content);
			webFrame.executeJavaScript(patchedContent).then(() => log(`Loaded script: ${name}`));

			webFrame.executeJavaScript(postVencordScript).then(() => log(`Loaded post-Vencord renderer`));
		} else {
			webFrame.executeJavaScript(content).then(() => log(`Loaded script: ${name}`));
		}
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
