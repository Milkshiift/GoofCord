import { type NativeImage, app, nativeImage } from "electron";
import sharp from "sharp";
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

	const baseImage = sharp(getCustomIcon());
	const { width, height } = await baseImage.metadata();
	if (!width || !height) return nativeImage.createFromPath(getCustomIcon());

	const overlaySize = Math.round(width * 0.6);
	const overlayImage = await sharp(getAsset(`badges/${clampedIndex}.png`))
		.resize(overlaySize, overlaySize)
		.toBuffer();

	const final = baseImage
		.composite([
			{
				input: overlayImage,
				top: height - overlaySize,
				left: width - overlaySize,
			},
		])
		.png();
	if (process.platform === "darwin") final.resize(22, 22);

	const finalNativeImage = nativeImage.createFromBuffer(await final.toBuffer());

	trayCache.set(clampedIndex, finalNativeImage);

	return finalNativeImage;
}
