import fs from "node:fs";
import path from "node:path";
import { Notification } from "electron";
import pc from "picocolors";
import { getConfig, setConfig } from "../config.ts";
import { getErrorMessage, isPathAccessible } from "../utils.ts";
import { assetsFolder } from "./assetLoader.ts";
import { profile } from "./chromeSpoofer.ts";

export const LOG_PREFIX = pc.yellow("[Mod Loader]");

const MOD_BUNDLES_URLS: {
	[key: string]: [string, string | undefined];
} = {
	vencord: ["https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css"],
	equicord: ["https://github.com/Equicord/Equicord/releases/download/latest/browser.js", "https://github.com/Equicord/Equicord/releases/download/latest/browser.css"],
	shelter: ["https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js", undefined],
	custom: [getConfig("customJsBundle"), getConfig("customCssBundle")],
};

async function downloadBundles(urls: Array<string | undefined>, name: string) {
	const cache = getConfig("modEtagCache");
	let logged = false;
	for (const url of urls) {
		if (!url) continue;
		try {
			const filepath = path.join(assetsFolder, `${name}${path.extname(url)}`);

			const exists = await isPathAccessible(filepath);

			const response = await fetch(url, {
				headers: {
					"User-Agent": profile.userAgent,
					"If-None-Match": exists ? (cache[url] ?? "") : "",
				},
			});

			// Up to date
			if (response.status === 304) continue;

			cache[url] = response.headers.get("ETag");

			if (!logged) console.log(LOG_PREFIX, "Downloading mod bundles for:", name);
			logged = true;

			const bundle = await response.text();

			await fs.promises.writeFile(filepath, bundle, "utf-8");
		} catch (e: unknown) {
			console.error(LOG_PREFIX, `Failed to download ${name} bundle:`, e);
			const notification = new Notification({
				title: `Failed to download ${name} mod bundle`,
				body: getErrorMessage(e),
				timeoutType: "default",
			});
			notification.show();
			return;
		}
	}
	if (logged) {
		await setConfig("modEtagCache", cache);
		console.log(LOG_PREFIX, "Bundles downloaded for:", name);
	}
}

const enabledMods: string[] = [];
export async function manageMods() {
	enabledMods.length = 0;
	const modNames: string[] = getConfig("modNames");
	const possibleMods = Object.keys(MOD_BUNDLES_URLS);
	for (const possibleMod of possibleMods) {
		const possibleModPath = path.join(assetsFolder, possibleMod);
		if (modNames.includes(possibleMod)) {
			enabledMods.push(possibleMod);
			try {
				await fs.promises.rename(possibleModPath + ".js.disabled", possibleModPath + ".js");
				await fs.promises.rename(possibleModPath + ".css.disabled", possibleModPath + ".css");
			} catch (e) {}
		} else {
			try {
				await fs.promises.rename(possibleModPath + ".js", possibleModPath + ".js.disabled");
				await fs.promises.rename(possibleModPath + ".css", possibleModPath + ".css.disabled");
			} catch (e) {}
		}
	}
}

export async function updateMods() {
	if (getConfig("noBundleUpdates")) {
		console.log(LOG_PREFIX, "Skipping bundle downloads");
		return;
	}
	for (const mod of enabledMods) {
		await downloadBundles(MOD_BUNDLES_URLS[mod], mod);
	}
}

export async function updateModsFull<IPCHandle>() {
	await manageMods();
	await updateMods();
}
