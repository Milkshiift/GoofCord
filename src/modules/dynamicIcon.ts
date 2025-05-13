import { type NativeImage, app, nativeImage } from "electron";
import { getTrayIcon, tray } from "../tray.ts";
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

export async function setBadgeCount<IPCHandle>(count: number) {
	switch (process.platform) {
		case "linux":
			app.setBadgeCount(count);
			break;
		case "darwin":
			if (count === 0) {
				app.dock?.setBadge("");
				break;
			}
			app.dock?.setBadge(count.toString());
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

	const cached = trayCache.get(clampedIndex);
	if (cached) return cached;

	if (clampedIndex === 0) {
		const trayImage = nativeImage.createFromPath(trayImagePath);
		if (process.platform === "darwin") trayImage.resize({ width: 22, height: 22 });
		trayCache.set(clampedIndex, trayImage);
		return trayImage;
	}

	const trayImage: string = await mainWindow.webContents.executeJavaScript(`
	(async () => {
	let data;

	canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;

	const img = new Image();
	img.width = 128;
	img.height = 128;

	img.onload = () => {
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.drawImage(img, 0, 0);

			const overlaySize = Math.round(img.width * 0.6);

			const iconImg = new Image();
			iconImg.width = overlaySize;
			iconImg.height = overlaySize;

			iconImg.onload = () => {
				ctx.drawImage(iconImg, img.width-overlaySize, img.height-overlaySize, overlaySize, overlaySize);
				data = canvas.toDataURL();
			};

			iconImg.src = "${nativeImage.createFromPath(getAsset(`badges/${clampedIndex}.png`)).toDataURL()}";
		}
	};

	img.src = "${nativeImage.createFromPath(trayImagePath).resize({width: 128, height: 128}).toDataURL()}";

	while (!data) {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
    return data;

	})();
	`);

	const nativeTrayImage = nativeImage.createFromDataURL(trayImage);

	if (process.platform === "darwin") nativeTrayImage.resize({ width: 22, height: 22 });

	trayCache.set(clampedIndex, nativeTrayImage);

	return nativeTrayImage;
}
