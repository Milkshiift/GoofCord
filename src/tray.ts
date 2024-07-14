import {app, Menu, nativeImage, Tray} from "electron";
import {mainWindow} from "./window";
import {getCustomIcon, getDisplayVersion} from "./utils";
import {createSettingsWindow} from "./settings/main";

export let tray: Tray;
export async function createTray() {
    const trayImage = nativeImage.createFromPath(getCustomIcon());

    const getTrayMenuIcon = () => {
        if (process.platform == "win32") {
            return trayImage.resize({height: 16});
        } else if (process.platform == "linux") {
            return trayImage.resize({height: 24});
        } else if (process.platform == "darwin") {
            return trayImage.resize({height: 18});
        }
        return trayImage;
    };

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
                app.exit();
            }
        }
    ]);

    await app.whenReady();

    if (process.platform === "darwin") {
        app.dock.setMenu(contextMenu);
    } else {
        tray = new Tray(trayImage);
        tray.setContextMenu(contextMenu);
        tray.setToolTip("GoofCord");
        tray.on("click", function () {
            mainWindow.show();
        });
    }
}
