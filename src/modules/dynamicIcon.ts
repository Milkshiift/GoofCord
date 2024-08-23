import path from "node:path";
import { type NativeImage, app, nativeImage } from "electron";
import { tray } from "../tray";
import { mainWindow } from "../window";

const badgeCache = new Map<number, NativeImage>();
function loadBadge(index: number) {
	index = Math.min(index, 10);

	const cached = badgeCache.get(index);
	if (cached) return cached;

	const img = nativeImage.createFromPath(path.join(__dirname, "assets/badges", `${index}.png`));
	badgeCache.set(index, img);

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
	index = Math.min(index, 10);

	const cached = trayCache.get(index);
	if (cached) return cached;

	const img = nativeImage.createFromPath(path.join(__dirname, "assets/badges", `tray${index}.png`));
	if (process.platform === "darwin") img.resize({ height: 22 });

	trayCache.set(index, img);

	return img;
}
