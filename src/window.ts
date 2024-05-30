import {app, BrowserWindow, shell} from "electron";
import {getCustomIcon} from "./utils";
import {getUserAgent} from "./modules/agent";
import * as path from "path";
import {initializeFirewall} from "./modules/firewall";
import {getConfig} from "./config";
import {registerCustomHandler} from "./screenshare/main";
import {initArrpc} from "./modules/arrpc";

export let mainWindow: BrowserWindow;

export async function createMainWindow() {
    const transparency: boolean = getConfig("transparency");
    mainWindow = new BrowserWindow({
        width: 835,
        height: 600,
        title: "GoofCord",
        show: !getConfig("startMinimized"),
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
            plugins: true,
            spellcheck: getConfig("spellcheck"),
        }
    });

    mainWindow.maximize();
    await doAfterDefiningTheWindow();
}

async function doAfterDefiningTheWindow() {
    // Set the user agent for the web contents based on the Chrome version.
    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);

    app.on("second-instance", () => {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });

    registerCustomHandler()
    setWindowOpenHandler()
    initArrpc()

    await initializeFirewall();

    // Load Discord
    mainWindow.loadURL(getConfig("discordUrl"));
}

async function setWindowOpenHandler() {
    // Define a handler for opening new windows.
    mainWindow.webContents.setWindowOpenHandler(({url}) => {
        // For Vencord's quick css
        if (url === "about:blank") {
            return {action: "allow"};
        }
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
        if (url.startsWith("http") || url.startsWith("mailto:")) {
            // Open external URLs using the system's default browser.
            shell.openExternal(url);
        }
        return {action: "deny"};
    });
}
