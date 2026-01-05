import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { Notification } from "electron";
import pc from "picocolors";
import { getConfig, setConfig } from "../../stores/config/config.main.ts";
import { getErrorMessage, isPathAccessible } from "../../utils.ts";
import { profile } from "../chromeSpoofer.ts";
import { ASSETS_FOLDER } from "./assetLoader.ts";
import { fileURLToPath } from "node:url";

export const LOG_PREFIX = pc.yellow("[Asset Manager]");

const MAX_CONCURRENCY = 5;
const TIMEOUT_MS = 15000;

function resolveAssetFilename(name: string, urlStr: string): string {
	const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");

	let extension = ".js";
	try {
		const url = new URL(urlStr);
		const pathExt = path.extname(url.pathname).toLowerCase();

		if (pathExt === ".css") {
			extension = ".css";
		}
	} catch (e) {
		const ext = path.extname(urlStr).toLowerCase();
		if (ext === ".css") {
			extension = ".css";
		} else {
			console.warn(LOG_PREFIX, `Could not parse URL '${urlStr}', defaulting to .js`);
		}
	}

	return `${safeName}${extension}`;
}

// Synchronize Filesystem with Config.
export async function manageAssets() {
	await fs.mkdir(ASSETS_FOLDER, { recursive: true });

	const assetsConfig = getConfig("assets") as Record<string, string>;
	const managedFiles = new Set(getConfig("managedFiles") as string[]);

	const expectedFiles = new Set<string>();

	if (assetsConfig && typeof assetsConfig === "object") {
		for (const [name, url] of Object.entries(assetsConfig)) {
			if (!url) continue;
			expectedFiles.add(resolveAssetFilename(name, url));
		}
	}

	const newManagedList: string[] = [];
	let configDirty = false;
	let missingAssetsDetected = false;

	// Clean up
	for (const filename of managedFiles) {
		if (!expectedFiles.has(filename)) {
			const filePath = path.join(ASSETS_FOLDER, filename);
			try {
				await fs.rm(filePath, { force: true });
				console.log(LOG_PREFIX, `Garbage collected: ${filename}`);
				configDirty = true;
			} catch (e) {
				console.error(LOG_PREFIX, `Failed to delete orphan ${filename}:`, e);
				// Retry next boot
				newManagedList.push(filename);
			}
		} else {
			newManagedList.push(filename);
		}
	}

	// Add new expected files to the list immediately
	for (const filename of expectedFiles) {
		if (!managedFiles.has(filename)) {
			newManagedList.push(filename);
			configDirty = true;
		}

		const filePath = path.join(ASSETS_FOLDER, filename);
		if (!(await isPathAccessible(filePath))) {
			missingAssetsDetected = true;
		}
	}

	if (configDirty) {
		await setConfig("managedFiles", newManagedList);
	}

	return missingAssetsDetected;
}

// Network update
export async function updateAssets() {
	const assetsConfig = getConfig("assets") as Record<string, string>;
	const etagCache = getConfig("assetEtags") as Record<string, string>;

	const errors: string[] = [];
	let cacheDirty = false;

	const queue = Object.entries(assetsConfig).filter(([, url]) => !!url);
	const total = queue.length;
	if (total === 0) return;

	console.log(LOG_PREFIX, `Checking ${total} assets for updates...`);

	const processAsset = async (name: string, urlStr: string) => {
		const filename = resolveAssetFilename(name, urlStr);
		const filepath = path.join(ASSETS_FOLDER, filename);
		const tempPath = `${filepath}.tmp`;

		try {
			let isLocalFile = false;
			let sourcePath = "";

			// Determine if this is a local file or a network request
			try {
				const urlObj = new URL(urlStr);
				if (urlObj.protocol === "file:") {
					isLocalFile = true;
					sourcePath = fileURLToPath(urlStr);
				}
			} catch (e) {
				// If URL parsing fails, check if it looks like an absolute path
				if (path.isAbsolute(urlStr)) {
					isLocalFile = true;
					sourcePath = urlStr;
				}
			}

			// Strategy 1: Local File System Copy
			if (isLocalFile) {
				const sourceStats = await fs.stat(sourcePath);

				// Check if destination exists to compare timestamps
				if (await isPathAccessible(filepath)) {
					const destStats = await fs.stat(filepath);

					// If source hasn't been modified since we last copied it, skip
					// (Allowing a small 100ms buffer for filesystem precision differences)
					if (sourceStats.mtimeMs <= destStats.mtimeMs + 100) {
						return;
					}
				}

				// Perform atomic copy via temp file
				await fs.copyFile(sourcePath, tempPath);
				await fs.rename(tempPath, filepath);
				console.log(LOG_PREFIX, `Local Copy Updated: ${name}`);

				// Clear ETag for this asset if it existed previously, as it is now managed locally
				if (etagCache[urlStr]) {
					delete etagCache[urlStr];
					cacheDirty = true;
				}
				return;
			}

			// Strategy 2: HTTP/Network Download
			const exists = await isPathAccessible(filepath);
			const previousEtag = exists ? (etagCache[urlStr] ?? "") : "";

			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

			try {
				const response = await fetch(urlStr, {
					headers: {
						"User-Agent": profile.userAgent,
						"If-None-Match": previousEtag,
					},
					signal: controller.signal,
				});

				if (response.status === 304) return; // Not Modified

				if (!response.ok) {
					throw new Error(`HTTP ${response.status} ${response.statusText}`);
				}

				if (!response.body) throw new Error("Empty response body");

				const fileStream = createWriteStream(tempPath);
				// biome-ignore lint/suspicious/noExplicitAny: fromWeb expects ReadableStream<any>
				const readableNodeStream = Readable.fromWeb(response.body as any);

				await pipeline(readableNodeStream, fileStream);
				await fs.rename(tempPath, filepath);

				const newEtag = response.headers.get("ETag");
				if (newEtag) {
					etagCache[urlStr] = newEtag;
					cacheDirty = true;
				}

				console.log(LOG_PREFIX, `Downloaded: ${name}`);
			} finally {
				clearTimeout(timeout);
				// Cleanup temp file if it still exists
				await fs.rm(tempPath, { force: true });
			}
		} catch (e) {
			const msg = `${name}: ${getErrorMessage(e)}`;
			console.error(LOG_PREFIX, msg);
			errors.push(msg);
		}
	};

	// Worker pool
	const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, total) }, async () => {
		while (queue.length > 0) {
			const entry = queue.shift();
			if (entry) await processAsset(entry[0], entry[1]);
		}
	});

	await Promise.allSettled(workers);

	if (cacheDirty) await setConfig("assetEtags", etagCache);

	if (errors.length > 0) {
		new Notification({
			title: "Asset Download Issues",
			body: errors.length === 1 ? errors[0] : `Failed to update ${errors.length} assets. Check logs for details.`,
		}).show();
	}
}

export async function updateAssetsFull<IPCHandle>() {
	const missingAssets = await manageAssets();
	if (missingAssets) await updateAssets();
}
