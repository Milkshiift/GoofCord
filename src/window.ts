import {app, BrowserWindow, nativeImage, shell} from "electron";
import {getConfig, getWindowState, setWindowState} from "./utils";
import {registerIpc} from "./ipc";
import {setMenu} from "./menu";
import * as fs from "fs";
import contextMenu from "electron-context-menu";
import {tray} from "./tray";
import {loadMods} from "./modules/plugin";
import {getUserAgent} from "./modules/agent";
import * as path from "path";
import {initializeFirewall} from "./modules/firewall";

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

// This function is asynchronous and runs after defining the window.
async function doAfterDefiningTheWindow() {
    // Check if the "startMinimized" config is true, and hide or show the mainWindow accordingly.
    (await getConfig("startMinimized")) ? mainWindow.hide() : mainWindow.show();

    // Dynamically import a module for screen sharing.
    import("./screenshare/main");

    registerIpc();
    await setMenu();

    // Set the user agent for the web contents based on the Chrome version.
    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);

    app.on("second-instance", () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });

    // Define a handler for opening new windows.
    mainWindow.webContents.setWindowOpenHandler(({url}) => {
        if (url === "about:blank") {
            return {action: "allow"};
        }
        if (url.startsWith("http") || url.startsWith("mailto:")) {
            // Open external URLs using the system's default browser.
            shell.openExternal(url);
        }
        return {action: "deny"};
    });

    // Handle the "page-favicon-updated" event, which updates the app's tray icon based on the website's favicon.
    mainWindow.webContents.on("page-favicon-updated", async () => {
        // Extract the favicon URL from the web page and update the tray icon.
        const faviconBase64 = await mainWindow.webContents.executeJavaScript(`
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

        const buf = Buffer.alloc(
            Buffer.byteLength(faviconBase64.replace(/^data:image\/\w+;base64,/, ""), "base64"),
            faviconBase64.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
        );

        fs.writeFileSync(path.join(app.getPath("temp"), "tray.png"), buf, "utf-8");

        const trayPath = nativeImage.createFromPath(path.join(app.getPath("temp"), "tray.png"));

        if (await getConfig("dynamicIcon") == true) mainWindow.setIcon(trayPath);

        // Additionally, handle icon resizing based on the platform.
        if (process.platform === "darwin" && trayPath.getSize().height > 22) trayPath.resize({height: 22});

        if (process.platform === "win32" && trayPath.getSize().height > 32) trayPath.resize({height: 32});

        // Finally, set the updated tray image.
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

    const setBodyAttribute = (attribute: string, value: string = "") => {
        mainWindow.webContents.executeJavaScript(`document.body.setAttribute("${attribute}", "${value}");`);
    };

    // @ts-ignore
<<<<<<< Updated upstream
    import("./arrpc/src/index.js");
=======
    if (await getConfig("arrpc")) import("arrpc");
>>>>>>> Stashed changes

    // Attach event listeners to the mainWindow for focus, blur, maximize, and unmaximize events.
    // These events trigger setting body attributes in the web contents.
    mainWindow.on("focus", () => setBodyAttribute("unFocused"));
    mainWindow.on("blur", () => setBodyAttribute("unFocused", ""));
    mainWindow.on("maximize", () => setBodyAttribute("isMaximized"));
    mainWindow.on("unmaximize", () => setBodyAttribute("isMaximized", ""));

    // Load an initial empty HTML file into the mainWindow.
    // Then, replace the window location with the configured Discord URL.
    await mainWindow.loadURL("data:text/html,");
    const disUrl = await getConfig("discordUrl");
    await mainWindow.webContents.executeJavaScript(`window.location.replace("${disUrl}");`).then(async () => {
        // If a user chose any mods, load them.
        if ((await getConfig("modName")) != "none") loadMods();

        // Disable logging using Sentry logger. There is a chance that this is useless.
        await mainWindow.webContents.executeJavaScript(`
                const Logger = window.__SENTRY__.logger
                Logger.disable()
        `);

        await initializeFirewall();
    });
}

export async function createCustomWindow() {
    mainWindow = new BrowserWindow({
        width: (await getWindowState("width")) ?? 835,
        height: (await getWindowState("height")) ?? 600,
        x: await getWindowState("x") ?? 0,
        y: await getWindowState("y") ?? 0,
        title: "GoofCord",
        show: false,
        darkTheme: true,
        icon: path.join(__dirname, "../", "/assets/gf_icon.png"),
        frame: false,
        autoHideMenuBar: true,
        backgroundColor: "#313338",
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
