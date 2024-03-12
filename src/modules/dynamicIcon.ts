import {app, nativeImage, NativeImage} from "electron";
import path from "path";
import {mainWindow} from "../window";
import {tray} from "../tray";

const badgeCache = new Map<number, NativeImage>();
function loadBadge(index: number) {
    index = Math.min(index, 10);

    const cached = badgeCache.get(index);
    if (cached) return cached;

    const img = nativeImage.createFromPath(path.join("assets/badges", `${index}.png`));
    badgeCache.set(index, img);

    return img;
}

export function setBadgeCount(count: number) {
    switch (process.platform) {
    case "linux":
    case "darwin":
        app.setBadgeCount(count);
        break;
    case "win32":
        mainWindow.setOverlayIcon(loadBadge(count), count+" Notifications");
        break;
    }
    tray.setImage(loadTrayImage(count));
}

const trayCache = new Map<number, NativeImage>();
function loadTrayImage(index: number) {
    index = Math.min(index, 10);

    const cached = trayCache.get(index);
    if (cached) return cached;

    const img = nativeImage.createFromPath(path.join("assets/badges", `tray${index}.png`));
    if (process.platform === "darwin") img.resize({height: 22});

    trayCache.set(index, img);

    return img;
}