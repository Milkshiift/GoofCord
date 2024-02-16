import {app, BrowserWindow, shell} from "electron";
import {getCustomIcon} from "./utils";
import {registerIpc} from "./ipc";
import {setMenu} from "./menu";
import {getUserAgent} from "./modules/agent";
import * as path from "path";
import {initializeFirewall} from "./modules/firewall";
import {getConfig} from "./config/config";
import {getWindowState, setWindowState} from "./config/windowStateManager";
import {registerCustomHandler} from "./screenshare/main";
import {initArrpc} from "./modules/arrpc";

export let mainWindow: BrowserWindow;

export async function createMainWindow() {
    const transparency: boolean = getConfig("transparency");
    mainWindow = new BrowserWindow({
        width: (await getWindowState("width")) ?? 835,
        height: (await getWindowState("height")) ?? 600,
        x: await getWindowState("x") ?? 0,
        y: await getWindowState("y") ?? 0,
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
    (getConfig("startMinimized")) ? mainWindow.hide() : mainWindow.show();

    // Set the user agent for the web contents based on the Chrome version.
    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);

    app.on("second-instance", () => {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });

    registerIpc();
    setMenu();
    registerCustomHandler();
    initArrpc();
    setWindowOpenHandler();
    setCloseEventHandler();
    setEventWindowStateHandlers();

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
                    frame: !getConfig("customTitlebar"),
                    autoHideMenuBar: true,
                    icon: getCustomIcon(),
                    backgroundColor: "#313338",
                    alwaysOnTop: true,
                    webPreferences: {
                        preload: getConfig("customTitlebar") ? path.join(__dirname, "preload/popoutPreload.js") : undefined,
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

async function setCloseEventHandler() {
    mainWindow.on("close", async (e) => {
        // Save window state, so it will be the same when the user opens GF again.
        const [width, height] = mainWindow.getSize();
        const position = mainWindow.getPosition();
        await setWindowState({
            width,
            height,
            isMaximized: mainWindow.isMaximized(),
            x: position[0],
            y: position[1],
        });

        e.preventDefault();
        getConfig("minimizeToTray") ? mainWindow.hide() : app.quit();
    });
}

async function setEventWindowStateHandlers() {
    const setBodyAttribute = (attribute: string, value: string = "") => {
        mainWindow.webContents.executeJavaScript(`document.body.setAttribute("${attribute}", "${value}");`);
    };

    // Attach event listeners to the mainWindow for maximize, and unmaximize events.
    // These events set body attributes in the web contents.
    //mainWindow.on("focus", () => setBodyAttribute("unFocused"));
    //mainWindow.on("blur", () => setBodyAttribute("unFocused", ""));
    // Used in the titlebar.ts
    mainWindow.on("maximize", () => setBodyAttribute("isMaximized"));
    mainWindow.on("unmaximize", () => setBodyAttribute("isMaximized", ""));
}