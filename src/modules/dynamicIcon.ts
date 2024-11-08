import { type NativeImage, app, nativeImage } from "electron";
import { Jimp } from "jimp";
import { tray } from "../tray.ts";
import { getAsset, getCustomIcon } from "../utils.ts";
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
	const clampedIndex = Math.min(index, 10);
	if (clampedIndex === 0) return nativeImage.createFromPath(getCustomIcon());

	const cached = trayCache.get(clampedIndex);
	if (cached) return cached;

	// Load base image
	const baseImage = await Jimp.read(getCustomIcon());
	const width = baseImage.width;
	const height = baseImage.height;

	// Load and resize overlay
	const overlaySize = Math.round(width * 0.6);
	const overlay = await Jimp.read(getAsset(`badges/${clampedIndex}.png`));
	overlay.resize({ w: overlaySize, h: overlaySize });

	// Composite images
	baseImage.composite(
		overlay,
		width - overlaySize, // left
		height - overlaySize, // top
	);

	// Resize for macOS if needed
	if (process.platform === "darwin") {
		baseImage.resize({ w: 22, h: 22 });
	}

	// Convert to buffer and create native image
	const buffer = await baseImage.getBuffer("image/png");
	const finalNativeImage = nativeImage.createFromBuffer(buffer);

	trayCache.set(clampedIndex, finalNativeImage);

	return finalNativeImage;
}
