import {app, BrowserWindow, clipboard, Menu} from "electron";
import {mainWindow} from "./window";
import {createSettingsWindow} from "./settings/main";

function paste(contents: any) {
    const contentTypes = clipboard.availableFormats().toString();
    //Workaround: fix pasting the images.
    if (contentTypes.includes("image/") && contentTypes.includes("text/html")) {
        clipboard.writeImage(clipboard.readImage());
    }
    contents.paste();
}

export async function setMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: "GoofCord",
            submenu: [
                {label: "About GoofCord", role: "about"}, //orderFrontStandardAboutPanel
                {type: "separator"},
                {
                    label: "Developer tools",
                    accelerator: "CmdOrCtrl+Shift+I",
                    click: function () {
                        BrowserWindow.getFocusedWindow()!.webContents.toggleDevTools();
                    }
                },
                {
                    label: "Open settings",
                    accelerator: "CmdOrCtrl+Shift+'",
                    click: function () {
                        createSettingsWindow();
                    }
                },
                {
                    label: "Reload",
                    accelerator: "CmdOrCtrl+R",
                    click: async function () {
                        mainWindow.reload();
                        await mainWindow.webContents.executeJavaScript(
                            `window.location.replace("https://canary.discord.com/app");`
                        );
                    }
                },
                {
                    label: "Quit",
                    accelerator: "CmdOrCtrl+Q",
                    click: function () {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Edit",
            submenu: [
                {label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo"},
                {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo"},
                {type: "separator"},
                {label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut"},
                {label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy"},
                {
                    label: "Paste",
                    accelerator: "CmdOrCtrl+V",
                    click: function () {
                        paste(mainWindow.webContents);
                    }
                },
                {label: "Select All", accelerator: "CmdOrCtrl+A", role: "selectAll"}
            ]
        },
        {
            label: "Zoom",
            submenu: [
                {label: "Zoom in", accelerator: "CmdOrCtrl+Plus", role: "zoomIn"},
                // Fix for zoom in on keyboards with dedicated + like QWERTZ (or numpad)
                // See https://github.com/electron/electron/issues/14742 and https://github.com/electron/electron/issues/5256
                {label: "Zoom in", accelerator: "CmdOrCtrl+=", role: "zoomIn", visible: false},
                {label: "Zoom out", accelerator: "CmdOrCtrl+-", role: "zoomOut"}
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
