import { type NativeImage, app, nativeImage } from "electron";
import { tray } from "../tray.ts";
import { getAsset } from "../utils.ts";
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

export function setBadgeCount<IPCHandle>(count: number) {
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
	tray.setImage(loadTrayImage(count));
}

const trayCache = new Map<number, NativeImage>();
function loadTrayImage(index: number) {
	const clampedIndex = Math.min(index, 10);

	const cached = trayCache.get(clampedIndex);
	if (cached) return cached;

	const img = nativeImage.createFromPath(getAsset(`badges/tray${clampedIndex}.png`));
	if (process.platform === "darwin") img.resize({ height: 22 });

	trayCache.set(clampedIndex, img);

	return img;
}
