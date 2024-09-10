import path from "node:path";
import { type NativeImage, app, nativeImage } from "electron";
import { tray } from "../tray";
import { mainWindow } from "../window";

const badgeCache = new Map<number, NativeImage>();
function loadBadge(index: number) {
	const clampedIndex = Math.min(index, 10);

	const cached = badgeCache.get(clampedIndex);
	if (cached) return cached;

	const img = nativeImage.createFromPath(path.join(__dirname, "assets/badges", `${clampedIndex}.png`));
	badgeCache.set(clampedIndex, img);

	return img;
}

export function setBadgeCount(count: number) {
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

	const img = nativeImage.createFromPath(path.join(__dirname, "assets/badges", `tray${clampedIndex}.png`));
	if (process.platform === "darwin") img.resize({ height: 22 });

	trayCache.set(clampedIndex, img);

	return img;
}
