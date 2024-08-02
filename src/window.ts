import {app, BrowserWindow, shell} from "electron";
import {getCustomIcon} from "./utils";
import {getUserAgent} from "./modules/agent";
import * as path from "path";
import {getConfig} from "./config";
import {registerCustomHandler} from "./screenshare/main";
import {initArrpc} from "./modules/arrpc";
import {adjustWindow} from "./modules/windowStateManager";
import fs from "fs/promises";

export let mainWindow: BrowserWindow;

export async function createMainWindow() {
    const transparency: boolean = getConfig("transparency");
    mainWindow = new BrowserWindow({
        title: "GoofCord",
        show: true,
        darkTheme: true,
        icon: getCustomIcon(),
        frame: !getConfig("customTitlebar"),
        autoHideMenuBar: true,
        backgroundColor: transparency ? "#00000000" : "#313338",
        transparent: transparency,
        backgroundMaterial: transparency ? "acrylic" : "none",
        webPreferences: {
            sandbox: false,
            preload: path.join(__dirname, "preload/preload.js"),
            nodeIntegrationInSubFrames: false,
            enableWebSQL: false,
            spellcheck: getConfig("spellcheck"),
            enableBlinkFeatures: getConfig("autoscroll") ? "MiddleClickAutoscroll" : undefined
        }
    });

    adjustWindow(mainWindow, "main", [true, [0,0], [835,600]]);
    if (getConfig("startMinimized")) mainWindow.hide();
    await doAfterDefiningTheWindow();
}

async function doAfterDefiningTheWindow() {
    // Set the user agent for the web contents based on the Chrome version.
    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);
    mainWindow.on('close', (event) => {
        if (getConfig("minimizeToTray") || process.platform === "darwin") {
            event.preventDefault();
            mainWindow.hide();
        }
    });
    const adblocker = await fs.readFile(path.join(__dirname, "/assets/adblocker.js"), "utf8");
    mainWindow.webContents.on("frame-created", (_, {frame}) => {
        frame.once("dom-ready", () => {
            if (frame.url.includes("youtube.com/embed/") || (frame.url.includes("discordsays") && frame.url.includes("youtube.com"))) {
                frame.executeJavaScript(adblocker);
            }
        });
    });

    subscribeToEvents();
    setWindowOpenHandler();
    void registerCustomHandler();
    void initArrpc();

    // Load Discord
    void mainWindow.loadURL(getConfig("discordUrl"));
}

let subscribed = false;
function subscribeToEvents() {
    if (subscribed) return;
    subscribed = true;
    app.on("second-instance", () => {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });
    app.on('activate', () => {
        mainWindow.show();
    })
}

function setWindowOpenHandler() {
    // Define a handler for opening new windows.
    mainWindow.webContents.setWindowOpenHandler(({url}) => {
        // For Vencord's quick css
        if (url === "about:blank") return {action: "allow"};
        // Allow Discord voice chat popout
        if (url.includes("discord.com/popout")) {
            return {
                action: "allow",
                overrideBrowserWindowOptions: {
                    frame: true,
                    autoHideMenuBar: true,
                    icon: getCustomIcon(),
                    backgroundColor: "#313338",
                    alwaysOnTop: getConfig("popoutWindowAlwaysOnTop"),
                    webPreferences: {
                        sandbox: true
                    }
                }
            };
        }
        if (url.startsWith("http") || url.startsWith("mailto:")) shell.openExternal(url);
        return {action: "deny"};
    });
}
