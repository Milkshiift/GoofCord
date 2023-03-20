// Modules to control application life and create native browser window
import {app, BrowserWindow, crashReporter, session} from "electron";
import "v8-compile-cache";
import {checkForDataFolder, checkIfConfigExists, getConfig, injectElectronFlags, installModLoader} from "./utils";
import "./extensions/mods";
import "./tray";
import {createCustomWindow} from "./window";
import path from "path";

export var iconPath: string;
export var settings: any;
export var customTitlebar: boolean;
export var clientName: "GoofCord";

if (!app.requestSingleInstanceLock()) {
    // kill if 2nd instance
    app.quit();
} else {
    // Your data now belongs to CCP
    crashReporter.start({uploadToServer: false});

    checkForDataFolder();
    checkIfConfigExists();
    injectElectronFlags();
    app.whenReady().then(async () => {
        if ((await getConfig("customIcon")) !== undefined ?? null) {
            iconPath = await getConfig("customIcon");
        } else {
            iconPath = path.join(__dirname, "../", "/assets/ac_icon_transparent.png");
        }

        async function init() {
            createCustomWindow();
            customTitlebar = true;
        }

        await init();
        await installModLoader();
        session.fromPartition("some-partition").setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === "notifications") {
                // Approves the permissions request
                callback(true);
            }
            if (permission === "media") {
                // Approves the permissions request
                callback(true);
            }
        });
        app.on("activate", async function () {
            if (BrowserWindow.getAllWindows().length === 0) await init();
        });
    });
}
