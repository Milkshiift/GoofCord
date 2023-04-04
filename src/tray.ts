import {app, Menu, nativeImage, Tray} from "electron";
import {mainWindow} from "./window";
import {getConfig, getDisplayVersion} from "./utils";
import * as path from "path";
import {createSettingsWindow} from "./settings/main";

export let tray: any = null;
app.whenReady().then(async () => {
    const trayIcon = "default";
    let trayPath = nativeImage.createFromPath(path.join(__dirname, "../", `/assets/${trayIcon}.png`));
    let trayVerIcon;
    trayVerIcon = function () {
        if (process.platform == "win32") {
            return trayPath.resize({height: 16});
        } else if (process.platform == "darwin") {
            return trayPath.resize({height: 18});
        } else if (process.platform == "linux") {
            return trayPath.resize({height: 24});
        }
    };

    if (process.platform == "darwin" && trayPath.getSize().height > 22) trayPath = trayPath.resize({height: 22});
    const clientName = (await getConfig("clientName")) ?? "GoofCord";
    tray = new Tray(trayPath);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: `${clientName} ` + getDisplayVersion(),
            icon: trayVerIcon(),
            enabled: false
        },
        {
            type: "separator"
        },
        {
            label: `Open ${clientName}`,
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
            label: `Quit ${clientName}`,
            click: function () {
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(clientName);
    tray.on("click", function () {
        mainWindow.show();
    });
});
