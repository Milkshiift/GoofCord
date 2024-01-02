import {app, Menu, nativeImage, Tray} from "electron";
import {mainWindow} from "./window";
import {getDisplayVersion} from "./utils";
import * as path from "path";
import {createSettingsWindow} from "./settings/main";

export let tray: any = null;
app.whenReady().then(async () => {
    const trayIcon = "default";
    let trayPath = nativeImage.createFromPath(path.join(__dirname, "../", `/assets/${trayIcon}.png`));

    const getTrayIcon = function () {
        if (process.platform == "win32") {
            return trayPath.resize({height: 16});
        } else if (process.platform == "darwin") {
            return trayPath.resize({height: 18});
        } else if (process.platform == "linux") {
            return trayPath.resize({height: 24});
        }
    };

    const ICON_SIZE_DARWIN = 22;
    if (process.platform == "darwin" && trayPath.getSize().height > ICON_SIZE_DARWIN) trayPath = trayPath.resize({height: ICON_SIZE_DARWIN});
    tray = new Tray(trayPath);
    const CONTEXT_MENU = Menu.buildFromTemplate([
        {
            label: "GoofCord " + getDisplayVersion(),
            icon: getTrayIcon(),
            enabled: false
        },
        {
            type: "separator"
        },
        {
            label: "Open GoofCord",
            click: function () {
                mainWindow.show();
            }
        },
        {
            label: "Open Settings",
            click: function () {
                createSettingsWindow();
            }
        },
        {
            type: "separator"
        },
        {
            label: "Quit GoofCord",
            click: function () {
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(CONTEXT_MENU);
    tray.setToolTip("GoofCord");
    tray.on("click", function () {
        mainWindow.show();
    });
});
