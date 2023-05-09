// Modules to control application life and create native browser window
import {app, BrowserWindow, crashReporter, session} from "electron";
import "v8-compile-cache";
import {checkConfig, checkIfConfigExists, checkIfWhitelistIsNotEmpty, installModLoader} from "./utils";
import {autoUpdater} from "electron-updater";
import "./extensions/mods";
import "./tray";
import {createCustomWindow} from "./window";
import path from "path";

export var iconPath: string;
export var clientName: "GoofCord";

if (!app.requestSingleInstanceLock()) {
    // kill if 2nd instance
    app.quit();
}
// Your data now belongs to CCP
crashReporter.start({uploadToServer: false});

autoUpdater.checkForUpdatesAndNotify();

app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");
app.commandLine.appendSwitch("enable-features", "WebRTC");
checkConfig();
checkIfWhitelistIsNotEmpty();
checkIfConfigExists();
app.whenReady().then(async () => {
    iconPath = path.join(__dirname, "../", "/assets/ac_icon_transparent.png");

    await createCustomWindow();
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
        if (BrowserWindow.getAllWindows().length === 0) await createCustomWindow();
    });
});

