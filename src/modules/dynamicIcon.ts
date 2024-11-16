import fs from "node:fs";
import { type NativeImage, app, nativeImage } from "electron";
import { Jimp } from "jimp";
import { tray } from "../tray.ts";
import { getAsset, getTrayIcon } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

const badgeCache = new Map<number, NativeImage>();
function loadBadge(index: number) {
	const clampedIndex = Math.min(index, 10);

	const cached = badgeCache.get(clampedIndex);
	if (cached) return cached;

	const img = nativeImage.createFromPath(getAsset(`badges/${clampedIndex}.png`));
	badgeCache.set(clampedIndex, img);

	return img;
}

export async function setBadgeCount<IPCHandle>(count: number) {
	switch (process.platform) {
		case "linux":
			app.setBadgeCount(count);
			break;
		case "darwin":
			if (count === 0) {
				app.dock.setBadge("");
				break;
			}
			app.dock.setBadge(count.toString());
			break;
		case "win32":
			mainWindow.setOverlayIcon(loadBadge(count), `${count} Notifications`);
			break;
	}
	if (process.platform === "darwin") return;
	tray.setImage(await loadTrayImage(count));
}

const trayCache = new Map<number, NativeImage>();
async function loadTrayImage(index: number) {
	const trayImagePath = await getTrayIcon();

	const clampedIndex = Math.min(index, 10);
	if (clampedIndex === 0) return nativeImage.createFromPath(trayImagePath);

	const cached = trayCache.get(clampedIndex);
	if (cached) return cached;

	const baseImage = await Jimp.read(trayImagePath);
	const { width, height } = baseImage.bitmap;
	if (!width || !height) return nativeImage.createFromPath(trayImagePath);

	const overlaySize = Math.round(width * 0.6);
	const overlayImage = await Jimp.read(await fs.promises.readFile(getAsset(`badges/${clampedIndex}.png`)));
	overlayImage.resize({ w: overlaySize, h: overlaySize });

	baseImage.composite(overlayImage, width - overlaySize, height - overlaySize);

	if (process.platform === "darwin") baseImage.resize({ w: 22, h: 22 });

	const finalBuffer = await baseImage.getBuffer("image/png");
	const finalNativeImage = nativeImage.createFromBuffer(finalBuffer);

	trayCache.set(clampedIndex, finalNativeImage);

	return finalNativeImage;
}
