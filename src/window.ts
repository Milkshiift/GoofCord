import {app, BrowserWindow, shell} from "electron";
import {getCustomIcon} from "./utils";
import {registerIpc} from "./ipc";
import {setMenu} from "./menu";
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
        show: false,
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
    if (getConfig("startMinimized")) {
        mainWindow.hide();
    } else {
        mainWindow.show();
    }

    // Set the user agent for the web contents based on the Chrome version.
    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);

    app.on("second-instance", () => {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });

    await Promise.all([
        registerCustomHandler(),
        initArrpc(),
        setWindowOpenHandler(),
        setEventWindowStateHandlers()
    ]);

    // Load Discord
    await mainWindow.loadURL(getConfig("discordUrl"));

    initializeFirewall();
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
                    alwaysOnTop: true,
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

async function setEventWindowStateHandlers() {
    const setBodyAttribute = (attribute: string, value: string = "") => {
        mainWindow.webContents.executeJavaScript(`document.body.setAttribute("${attribute}", "${value}");`);
    };

    // Attach event listeners to the mainWindow for maximize, and unmaximize events.
    // These events set body attributes in the web contents.
    // Used in the titlebar.ts
    mainWindow.on("maximize", () => setBodyAttribute("isMaximized"));
    mainWindow.on("unmaximize", () => setBodyAttribute("isMaximized", ""));
    //mainWindow.on("focus", () => setBodyAttribute("unFocused"));
    //mainWindow.on("blur", () => setBodyAttribute("unFocused", ""));
}