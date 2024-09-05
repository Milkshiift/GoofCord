import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Notification } from "electron";
import { getConfig } from "../config";
import { getErrorMessage } from "../utils";
import { assetsFolder } from "./assetLoader";

export const LOG_PREFIX = chalk.yellow("[Mod Loader]");

interface ModBundleUrls {
	[key: string]: [string | undefined, string | undefined];
}

const modNames: string[] = getConfig("modNames");
const MOD_BUNDLES_URLS: ModBundleUrls = {
	vencord: ["https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css"],
	equicord: ["https://github.com/Equicord/Equicord/releases/download/latest/browser.js", "https://github.com/Equicord/Equicord/releases/download/latest/browser.css"],
	shelter: ["https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js", undefined],
	custom: [getConfig("customJsBundle"), getConfig("customCssBundle")],
};

async function downloadBundles(urls: Array<string | undefined>, name: string) {
	console.log(LOG_PREFIX, "Downloading mod bundles for:", name);
	for (const url of urls) {
		if (!url) continue;
		try {
			const response = await fetch(url);
			const bundle = await response.text();

			await fs.promises.writeFile(path.join(assetsFolder, `${name}${path.extname(url)}`), bundle, "utf-8");
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
	console.log(LOG_PREFIX, "Bundles downloaded for:", name);
}

const enabledMods: string[] = [];
export async function manageMods() {
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
		void downloadBundles(MOD_BUNDLES_URLS[mod], mod);
	}
}
