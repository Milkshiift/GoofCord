import {app, Menu, nativeImage, Tray} from "electron";
import {mainWindow} from "./window";
import {getDisplayVersion} from "./utils";
import * as path from "path";
import {createSettingsWindow} from "./settings/main";

export async function createTray() {
    const trayPath = nativeImage.createFromPath(path.join(__dirname, "../", "/assets/gf_icon.png"));

    // This is maybe unnecessary, but I can't test it so it stays
    const getTrayMenuIcon = () => {
        if (process.platform == "win32") {
            return trayPath.resize({height: 16});
        } else if (process.platform == "darwin") {
            return trayPath.resize({height: 18});
        }
        return trayPath;
    };

    if (process.platform === "darwin") trayPath.resize({height: 22});

    const tray = new Tray(trayPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "GoofCord " + getDisplayVersion(),
            icon: getTrayMenuIcon(),
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

    tray.setContextMenu(contextMenu);
    tray.setToolTip("GoofCord");
    tray.on("click", function () {
        mainWindow.show();
    });
}