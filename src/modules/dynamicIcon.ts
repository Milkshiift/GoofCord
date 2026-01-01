import { app, type NativeImage, nativeImage } from "electron";
import { getConfig } from "../stores/config/config.main.ts";
import { mainWindow } from "../windows/main/main.ts";
import { getTrayIcon, tray } from "./tray.ts";

const BADGE_GENERATOR_CODE = `
	function generateBadge(num) {
		const canvas = document.createElement("canvas");
		const size = 64; 
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		// Red circle background
		ctx.fillStyle = '#f35a5a';
		ctx.beginPath();
		ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
		ctx.fill();
		
		// The "dot" for unread messages
		if (num === -1) {
			ctx.fillStyle = 'white';
			ctx.beginPath();
			ctx.arc(size / 2, size / 2, size / 5, 0, 2 * Math.PI);
			ctx.fill();
			return canvas;
		}

		const text = num > 99 ? '∞' : num.toString();
		
		// White text
		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		let fontSize;
		if (text === '∞') {
			fontSize = size * 1.0; 
		} else if (text.length > 1) { // Two digits
			fontSize = size * 0.7;
		} else { // Single digit
			fontSize = size * 0.8;
		}
		ctx.font = \`bold \${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif\`;
		
		// Apply a slight vertical offset for better optical centering of numbers.
		ctx.fillText(text, size / 2, size / 2 + (size * 0.04));
		
		return canvas;
	}
`;

const badgeCache = new Map<number, NativeImage>();
async function generateBadgeOverlay(count: number): Promise<NativeImage | null> {
	if (count === 0) {
		return null;
	}
	const clampedCount = Math.min(count, 100);

	const cached = badgeCache.get(clampedCount);
	if (cached) return cached;

	const rendererFunction = `
		(count) => {
			${BADGE_GENERATOR_CODE}
			const canvas = generateBadge(count);
			return canvas ? canvas.toDataURL() : '';
		}
	`;

	const dataURL = await mainWindow.webContents.executeJavaScript(`(${rendererFunction})(${clampedCount})`);

	if (!dataURL) {
		console.error("Failed to generate badge overlay icon in renderer.");
		return nativeImage.createEmpty();
	}

	const img = nativeImage.createFromDataURL(dataURL);
	badgeCache.set(clampedCount, img);
	return img;
}

// Pings: >0   Unset: 0    Unread messages: -1
export async function setBadgeCount<IPCHandle>(requestedCount: number) {
	const count = getConfig("unreadBadge") ? requestedCount : Math.max(0, requestedCount);

	switch (process.platform) {
		case "linux":
			app.setBadgeCount(Math.max(0, count));
			break;
		case "darwin":
			app.dock?.setBadge(count > 0 ? count.toString() : "");
			break;
		case "win32": {
			const overlay = await generateBadgeOverlay(count);
			const description = count > 0 ? `${count} Notifications` : count < 0 ? "Unread messages" : "No new notifications";
			mainWindow.setOverlayIcon(overlay, description);
			break;
		}
	}

	if (process.platform === "darwin") return;
	tray.setImage(await loadTrayImage(count));
}

const TRAY_COMPOSITOR_CODE = `
	async (baseImageDataURL, count) => {
		const loadImage = (src) => new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = src;
		});

		${BADGE_GENERATOR_CODE}

		const finalCanvas = document.createElement("canvas");
		const finalSize = 128;
		finalCanvas.width = finalSize;
		finalCanvas.height = finalSize;
		const ctx = finalCanvas.getContext("2d");
		if (!ctx) return '';

		// Draw the base tray icon
		const baseImg = await loadImage(baseImageDataURL);
		ctx.drawImage(baseImg, 0, 0, finalSize, finalSize);

		// If there's a count, draw the badge on top
		if (count !== 0) {
			const badgeCanvas = generateBadge(count);
			if (badgeCanvas) {
				const overlaySize = Math.round(finalSize * 0.60);
				// Position the badge in the bottom-right corner
				const overlayOffset = finalSize - overlaySize; 
				ctx.drawImage(badgeCanvas, overlayOffset, overlayOffset, overlaySize, overlaySize);
			}
		}

		return finalCanvas.toDataURL();
	}
`;

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

	const baseTrayIconDataURL = nativeImage
		.createFromPath(await getTrayIcon())
		.resize({ width: 128, height: 128 })
		.toDataURL();

	const finalImageDataURL = await mainWindow.webContents.executeJavaScript(`(${TRAY_COMPOSITOR_CODE})("${baseTrayIconDataURL}", ${clampedIndex})`);

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
