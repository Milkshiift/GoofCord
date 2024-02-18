import {app, Menu, nativeImage, Tray} from "electron";
import {mainWindow} from "./window";
import {getCustomIcon, getDisplayVersion} from "./utils";
import {createSettingsWindow} from "./settings/main";

export async function createTray() {
    const trayPath = nativeImage.createFromPath(getCustomIcon());

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