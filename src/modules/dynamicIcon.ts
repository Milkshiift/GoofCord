import { app, type NativeImage, nativeImage } from "electron";
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
export async function loadTrayImage(index: number) {
	const clampedIndex = Math.min(index, 100);

	const cached = trayCache.get(clampedIndex);
	if (cached) return cached;

	if (clampedIndex === 0) {
		const trayImage = nativeImage.createFromPath(await getTrayIcon());
		if (process.platform === "darwin") trayImage.setTemplateImage(true);
		trayCache.set(clampedIndex, trayImage);
		return trayImage;
	}

	const rendererFunction = `
		async (baseImageDataURL, count) => {
			const loadImage = (src) => new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = src;
			});

			function generateBadge(num) {
				const canvas = document.createElement("canvas");
				const size = 64; 
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext("2d");
				if (!ctx) return null;

				ctx.fillStyle = '#f35a5a';
				ctx.beginPath();
				ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
				ctx.fill();

				const text = num > 99 ? '∞' : num.toString();
				
				ctx.fillStyle = 'white';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';

				let fontSize;
				if (text === '∞') {
					fontSize = size * 1.0; 
				} else if (text.length > 1) {
					fontSize = size * 0.7;
				} else {
					fontSize = size * 0.8;
				}
				ctx.font = \`bold \${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif\`;
				
				// better optical centering.
				ctx.fillText(text, size / 2, size / 2 + (size * 0.04));
				
				return canvas;
			}

			const finalCanvas = document.createElement("canvas");
			const finalSize = 128; 
			finalCanvas.width = finalSize;
			finalCanvas.height = finalSize;
			const ctx = finalCanvas.getContext("2d");
			if (!ctx) return '';

			const baseImg = await loadImage(baseImageDataURL);
			ctx.drawImage(baseImg, 0, 0, finalSize, finalSize);

			if (count > 0) {
				const badgeCanvas = generateBadge(count);
				if (badgeCanvas) {
					const overlaySize = Math.round(finalSize * 0.60);
					
					const overlayOffset = finalSize - overlaySize; 
					
					ctx.drawImage(badgeCanvas, overlayOffset, overlayOffset, overlaySize, overlaySize);
				}
			}

			return finalCanvas.toDataURL();
		}
	`;

	const baseTrayIconDataURL = nativeImage.createFromPath(await getTrayIcon())
		.resize({ width: 128, height: 128 })
		.toDataURL();

	const finalImageDataURL = await mainWindow.webContents.executeJavaScript(
		`(${rendererFunction})("${baseTrayIconDataURL}", ${clampedIndex})`
	);

	if (!finalImageDataURL) {
		console.error("Failed to generate badged tray icon in renderer.");
		return nativeImage.createFromPath(await getTrayIcon());
	}

	const nativeTrayImage = nativeImage.createFromDataURL(finalImageDataURL);

	if (process.platform === "darwin") {
		nativeTrayImage.setTemplateImage(true);
	}

	trayCache.set(clampedIndex, nativeTrayImage);
	return nativeTrayImage;
}
