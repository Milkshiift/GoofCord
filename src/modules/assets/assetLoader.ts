import { watch } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { getGoofCordFolderPath, readOrCreateFolder } from "../../utils.ts";
import { mainWindow } from "../../windows/main/main.ts";
import { dialog } from "electron";
import { getConfig, setConfig } from "@root/src/stores/config/config.main.ts";

const LOG_PREFIX = pc.yellowBright("[Asset Loader]");
export const ASSETS_FOLDER = path.join(getGoofCordFolderPath(), "assets/");

const SCAN_LENGTH = 500;

const MARKERS = {
	PRE: "prevencordmarker",
	POST: "postvencordmarker",
	VENCORD: "vencord",
};

export type AssetTuple = [filename: string, content: string];

export interface ScriptContainer {
	pre: AssetTuple | null;
	vencord: AssetTuple | null;
	post: AssetTuple | null;
	others: AssetTuple[];
}

export const enabledAssets = {
	scripts: {
		pre: null,
		vencord: null,
		post: null,
		others: [],
	} as ScriptContainer,
	styles: [] as AssetTuple[],
};

export function getAssets<IPCOn>() {
	return enabledAssets;
}

async function readAssetFile(filename: string): Promise<AssetTuple | null> {
	try {
		const filePath = path.join(ASSETS_FOLDER, filename);
		const content = await fs.readFile(filePath, "utf-8");
		return [filename, content];
	} catch (err) {
		console.error(LOG_PREFIX, `Failed to read asset ${filename}:`, err);
		return null;
	}
}

function categorizeScript(filename: string, content: string, container: ScriptContainer) {
	const head = content.slice(0, SCAN_LENGTH).toLowerCase();

	if (head.includes(MARKERS.PRE)) {
		container.pre = [filename, content];
	} else if (head.includes(MARKERS.POST)) {
		container.post = [filename, content];
	} else if (head.includes(MARKERS.VENCORD)) {
		if (container.vencord) {
			console.warn(LOG_PREFIX, `Duplicate Vencord-based client mod detected: ${filename}`);
			void dialog.showMessageBox({
				type: "warning",
				title: "Duplicate Vencord Detected",
				message: `Multiple Vencord-based client mods were found.\n\nEnsure you only have a single Vencord-based client mod to avoid conflicts.`,
				buttons: ["OK"],
			});
		}

		container.vencord = [filename, content];
	} else {
		container.others.push([filename, content]);
	}
}

export async function categorizeAllAssets() {
	const scriptContainer: ScriptContainer = { pre: null, vencord: null, post: null, others: [] };

	try {
		const allFiles = await readOrCreateFolder(ASSETS_FOLDER);

		const [rawScripts, rawStyles] = await Promise.all([
			// Scripts
			Promise.all(allFiles.filter((f) => f.endsWith(".js")).map(readAssetFile)),
			// Styles
			Promise.all(allFiles.filter((f) => f.endsWith(".css")).map(readAssetFile)),
		]);

		for (const asset of rawScripts) {
			if (!asset) continue;
			categorizeScript(asset[0], asset[1], scriptContainer);
		}

		const missingItems: string[] = [];
		if (!scriptContainer.vencord) missingItems.push("A Vencord-based client mod");
		if (!scriptContainer.pre) missingItems.push("Pre-Vencord script");
		if (!scriptContainer.post) missingItems.push("Post-Vencord script");
		if (missingItems.length > 0) {
			console.error(LOG_PREFIX, "Critical assets missing:", missingItems.join(", "));

			const missingList = missingItems.map((item) => `• ${item}`).join("\n");

			if (!getConfig("dontShowMissingAssetsWarning")) {
				dialog
					.showMessageBox(mainWindow || undefined, {
						type: "error",
						title: "Critical Assets Missing",
						message: `GoofCord failed to find the following required assets:\n${missingList}\n\nEnsure you have them in the "External Assets" setting, or manually add them to your assets folder.\n\nMany GoofCord features will be broken or unavailable.`,
						buttons: ["OK", "Don't show again"],
					})
					.then((returnValue) => {
						if (returnValue.response === 1) {
							void setConfig("dontShowMissingAssetsWarning", true);
						}
					});
			}
		}

		enabledAssets.scripts = scriptContainer;
		enabledAssets.styles = rawStyles.filter((a): a is AssetTuple => a !== null);

		console.log(LOG_PREFIX, `Assets Ready: Pre(${!!scriptContainer.pre}) | Vencord(${!!scriptContainer.vencord}) | Post(${!!scriptContainer.post}) | Plugins(${scriptContainer.others.length})`);
	} catch (err) {
		console.error(LOG_PREFIX, "Critical failure loading assets:", err);
	}
}

export async function startStyleWatcher() {
	try {
		await fs.mkdir(ASSETS_FOLDER, { recursive: true });

		const watcher = watch(ASSETS_FOLDER, { recursive: false });
		let debounceTimer: NodeJS.Timeout | null = null;

		const changedFiles = new Set<string>();

		watcher.on("change", (_eventType, filename) => {
			if (!filename || !filename.toString().endsWith(".css")) return;

			const fileStr = filename.toString();
			changedFiles.add(fileStr);

			if (debounceTimer) clearTimeout(debounceTimer);

			debounceTimer = setTimeout(async () => {
				const batch = new Set(changedFiles);
				changedFiles.clear();

				for (const file of batch) {
					await processStyleUpdate(file);
				}
			}, 200);
		});

		console.log(LOG_PREFIX, "Style watcher started");
	} catch (err) {
		console.error(LOG_PREFIX, "Failed to initialize style watcher:", err);
	}
}

async function processStyleUpdate(filename: string) {
	try {
		const filePath = path.join(ASSETS_FOLDER, filename);

		// Check if file still exists
		try {
			await fs.access(filePath);
		} catch {
			// File deleted
			mainWindow?.webContents.send("assetLoader:styleUpdate", {
				file: filename,
				content: "",
			});
			return;
		}

		const content = await fs.readFile(filePath, "utf-8");
		mainWindow?.webContents.send("assetLoader:styleUpdate", {
			file: filename,
			content,
		});
		console.log(LOG_PREFIX, `Hot-reloaded: ${filename}`);
	} catch (err) {
		console.error(LOG_PREFIX, `Error processing update for ${filename}:`, err);
	}
}
