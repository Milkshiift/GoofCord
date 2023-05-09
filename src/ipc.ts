//ipc stuff
import {app, desktopCapturer, ipcMain, nativeImage, shell} from "electron";
import {mainWindow} from "./window";
import {getConfig, getDisplayVersion, getVersion, getWindowState, packageVersion, setConfigBulk} from "./utils";
import {createSettingsWindow} from "./settings/main";
import os from "os";
import path from "path";

export function registerIpc() {
    ipcMain.on("get-app-path", (event) => {
        event.reply("app-path", app.getAppPath());
    });
    ipcMain.on("open-external-link", (event, href: string) => {
        shell.openExternal(href);
    });
    ipcMain.on("setPing", (event, pingCount: number) => {
        switch (os.platform()) {
            case "linux" ?? "macos":
                app.setBadgeCount(pingCount);
                break;
            case "win32":
                if (pingCount > 0) {
                    const image = nativeImage.createFromPath(path.join(__dirname, "../", `/assets/ping.png`));
                    mainWindow.setOverlayIcon(image, "badgeCount");
                } else {
                    mainWindow.setOverlayIcon(null, "badgeCount");
                }
                break;
        }
    });
    ipcMain.on("win-maximize", () => {
        mainWindow.maximize();
    });
    ipcMain.on("win-isMaximized", (event) => {
        event.returnValue = mainWindow.isMaximized();
    });
    ipcMain.on("win-isNormal", (event) => {
        event.returnValue = mainWindow.isNormal();
    });
    ipcMain.on("win-minimize", () => {
        mainWindow.minimize();
    });
    ipcMain.on("win-unmaximize", () => {
        mainWindow.unmaximize();
    });
    ipcMain.on("win-show", () => {
        mainWindow.show();
    });
    ipcMain.on("win-hide", () => {
        mainWindow.hide();
    });
    ipcMain.on("win-quit", () => {
        app.exit();
    });
    ipcMain.on("get-app-version", (event) => {
        event.returnValue = getVersion();
    });
    ipcMain.on("displayVersion", (event) => {
        event.returnValue = getDisplayVersion();
    });
    ipcMain.on("get-package-version", (event) => {
        event.returnValue = packageVersion;
    });
    ipcMain.on("splashEnd", async () => {
        try {
            var width = (await getWindowState("width")) ?? 800;
            var height = (await getWindowState("height")) ?? 600;
            var isMaximized = (await getWindowState("isMaximized")) ?? false;
            var xValue = await getWindowState("x");
            var yValue = await getWindowState("y");
        } catch (e) {
            console.log("[Window state manager] No window state file found. Fallbacking to default values.");
            mainWindow.setSize(800, 600);
        }
        if (isMaximized) {
            mainWindow.setSize(800, 600); //just so the whole thing doesn't cover whole screen
            mainWindow.maximize();
        } else {
            mainWindow.setSize(width, height);
            mainWindow.setPosition(xValue, yValue);
            console.log("[Window state manager] Not maximized.");
        }
    });
    ipcMain.on("restart", () => {
        app.relaunch();
        app.exit();
    });
    ipcMain.on("saveSettings", (event, args) => {
        setConfigBulk(args);
    });
    ipcMain.on("minimizeToTray", async (event) => {
        event.returnValue = await getConfig("minimizeToTray");
    });
    ipcMain.on("titlebar", (event) => {
        event.returnValue = true;
    });
    ipcMain.on("openSettingsWindow", () => {
        createSettingsWindow();
    });
    ipcMain.handle("DESKTOP_CAPTURER_GET_SOURCES", (event, opts) => desktopCapturer.getSources(opts));
}
