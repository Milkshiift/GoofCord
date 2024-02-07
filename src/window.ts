import {app, BrowserWindow, nativeImage, shell} from "electron";
import {getCustomIcon} from "./utils";
import {registerIpc} from "./ipc";
import {setMenu} from "./menu";
import * as fs from "fs-extra";
import contextMenu from "electron-context-menu";
import { tray } from "./tray";
import {getUserAgent} from "./modules/agent";
import * as path from "path";
import {initializeFirewall} from "./modules/firewall";
import {loadExtensions} from "./modules/extensions";
import {getConfig} from "./config/config";
import {getWindowState, setWindowState} from "./config/windowStateManager";
import {registerCustomHandler} from "./screenshare/main";
import {initArrpc} from "./modules/arrpc";

export let mainWindow: BrowserWindow;
contextMenu({
    showSaveImageAs: true,
    showCopyImageAddress: true,
    showSearchWithGoogle: false,
    prepend: (_defaultActions, parameters) => [
        {
            label: "Search with Google",
            // Only show it when right-clicking text
            visible: parameters.selectionText.trim().length > 0,
            click: () => {
                shell.openExternal(`https://google.com/search?q=${encodeURIComponent(parameters.selectionText)}`);
            }
        },
        {
            label: "Search with DuckDuckGo",
            // Only show it when right-clicking text
            visible: parameters.selectionText.trim().length > 0,
            click: () => {
                shell.openExternal(`https://duckduckgo.com/?q=${encodeURIComponent(parameters.selectionText)}`);
            }
        }
    ]
});

async function doAfterDefiningTheWindow() {
    (await getConfig("startMinimized")) ? mainWindow.hide() : mainWindow.show();

    registerIpc();
    setMenu();
    registerCustomHandler();

    // Set the user agent for the web contents based on the Chrome version.
    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);

    app.on("second-instance", () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });

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
                    frame: false,
                    autoHideMenuBar: true,
                    icon: path.join(__dirname, "../", "/assets/gf_icon.png"),
                    backgroundColor: "#313338",
                    alwaysOnTop: true,
                    webPreferences: {
                        preload: path.join(__dirname, "preload/popoutPreload.js"),
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

    // Handle the "page-favicon-updated" event, which updates the app's tray icon based on the website's favicon.
    mainWindow.webContents.on("page-favicon-updated", async () => {
        // Extract the favicon from the web page and update the tray icon.
        const FAVICON_BASE_64 = await mainWindow.webContents.executeJavaScript(`
            var getFavicon = () => {
                let favicon = undefined;
                const nodeList = document.getElementsByTagName("link");
                for (let i = 0; i < nodeList.length; i++) {
                    if (nodeList[i].getAttribute("rel") === "icon" || nodeList[i].getAttribute("rel") === "shortcut icon") {
                        favicon = nodeList[i].getAttribute("href");
                    }
                }
                return favicon;
            }
            getFavicon();
        `);

        const buffer = Buffer.alloc(
            Buffer.byteLength(FAVICON_BASE_64.replace(/^data:image\/\w+;base64,/, ""), "base64"),
            FAVICON_BASE_64.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
        );

        const trayPath = nativeImage.createFromBuffer(buffer);

        if (await getConfig("dynamicIcon") == true) {
            if (process.platform === "darwin") {
                app.dock.setIcon(trayPath);
            }
            else {
                mainWindow.setIcon(trayPath);
            }
        }

        // Handle icon resizing based on the platform.
        if (process.platform === "darwin") trayPath.resize({height: 22});
        if (process.platform === "win32") trayPath.resize({height: 32});

        tray.setImage(trayPath);
    });

    mainWindow.on("close", async (e) => {
        // Save window state, so it will be the same when the user opens GF again.
        const [width, height] = mainWindow.getSize();
        await setWindowState({
            width,
            height,
            isMaximized: mainWindow.isMaximized(),
            x: mainWindow.getPosition()[0],
            y: mainWindow.getPosition()[1],
        });

        e.preventDefault();
        await getConfig("minimizeToTray") ? mainWindow.hide() : app.quit();
    });

    initArrpc();

    const setBodyAttribute = (attribute: string, value: string = "") => {
        mainWindow.webContents.executeJavaScript(`document.body.setAttribute("${attribute}", "${value}");`);
    };

    // Attach event listeners to the mainWindow for focus, blur, maximize, and unmaximize events.
    // These events trigger setting body attributes in the web contents.
    mainWindow.on("focus", () => setBodyAttribute("unFocused"));
    mainWindow.on("blur", () => setBodyAttribute("unFocused", ""));
    mainWindow.on("maximize", () => setBodyAttribute("isMaximized"));
    mainWindow.on("unmaximize", () => setBodyAttribute("isMaximized", ""));

    // Load an initial empty HTML file into the mainWindow.
    // Then, replace the window location with the configured Discord URL.
    await mainWindow.loadFile(path.join(__dirname, "./", "/assets/html/empty.html"));
    const DISCORD_URL = await getConfig("discordUrl");
    await mainWindow.webContents.executeJavaScript(`window.location.replace("${DISCORD_URL}");`).then(async () => {
        if ((await getConfig("modName")) != "none") await loadExtensions();
        initializeFirewall();
    });
}

export async function createMainWindow() {
    const transparency = await getConfig("transparency");
    mainWindow = new BrowserWindow({
        width: (await getWindowState("width")) ?? 835,
        height: (await getWindowState("height")) ?? 600,
        x: await getWindowState("x") ?? 0,
        y: await getWindowState("y") ?? 0,
        title: "GoofCord",
        show: false,
        darkTheme: true,
        icon: await getCustomIcon(),
        frame: !await getConfig("framelessWindow"),
        autoHideMenuBar: true,
        backgroundColor: transparency ? "#00000000" : "#313338",
        transparent: transparency,
        backgroundMaterial: transparency ? "acrylic" : "none",
        webPreferences: {
            sandbox: false,
            preload: path.join(__dirname, "preload/preload.js"),
            contextIsolation: true,
            nodeIntegrationInSubFrames: false,
            enableWebSQL: false,
            plugins: true,
            spellcheck: await getConfig("spellcheck"),
        }
    });

    mainWindow.maximize();
    await doAfterDefiningTheWindow();
}
