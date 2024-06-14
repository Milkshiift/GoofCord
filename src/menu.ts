import {app, BrowserWindow, Menu} from "electron";
import {mainWindow} from "./window";
import {createSettingsWindow} from "./settings/main";
import {cycleThroughPasswords} from "./modules/messageEncryption";
import contextMenu from "electron-context-menu";

export async function setMenu() {
    void setApplicationMenu();
    setContextMenu();
}

export async function setApplicationMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: "GoofCord",
            submenu: [
                {label: "About GoofCord", role: "about"},
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
                    label: "Cycle through passwords",
                    accelerator: "F9",
                    click: async function () {
                        cycleThroughPasswords();
                    }
                },
                {
                    label: "Reload",
                    accelerator: "CmdOrCtrl+R",
                    click: async function () {
                        mainWindow.reload();
                    }
                },
                {
                    label: "Full reload",
                    accelerator: "Shift+CmdOrCtrl+R",
                    click: async function () {
                        app.relaunch();
                        app.exit();
                    }
                },
                {
                    label: "Fullscreen",
                    role: "togglefullscreen"
                },
                {
                    label: "Quit",
                    accelerator: "CmdOrCtrl+Q",
                    click: function () {
                        app.exit();
                    }
                },
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
                {label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste"},
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
        },
        {
            label: "Developer",
            submenu: [
                {
                    label: "Open chrome://gpu",
                    accelerator: "CmdorCtrl+Alt+G",
                    click() {
                        const gpuWindow = new BrowserWindow({
                            width: 900,
                            height: 700,
                            useContentSize: true,
                            title: "GPU Internals"
                        });
                        gpuWindow.loadURL("chrome://gpu");
                    }
                }
            ]
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function setContextMenu() {
    contextMenu({
        showSelectAll: true,
        showSaveImageAs: true,
        showCopyImage: true,
        showCopyImageAddress: true,
        showCopyLink: true,
        showSaveLinkAs: true,
        showInspectElement: true,
        showSearchWithGoogle: true,
        showSearchWithDuckDuckGo: true
    });
}
