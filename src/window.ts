import {app, BrowserWindow, nativeImage, session, shell} from "electron";
import {getConfig, setWindowState} from "./utils";
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

async function doAfterDefiningTheWindow() {
    ( await getConfig("startMinimized") ) ? mainWindow.hide() : mainWindow.show();

    import("./screenshare/main");
    registerIpc();
    await setMenu();

    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);

    app.on("second-instance", () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url === "about:blank") {
            return { action: "allow" };
        }
        if (url.startsWith("http") || url.startsWith("mailto:")) {
            shell.openExternal(url);
        }
        return { action: "deny" };
    });

    mainWindow.webContents.on("page-favicon-updated", async () => {
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

        if (process.platform === "darwin" && trayPath.getSize().height > 22) trayPath.resize({ height: 22 });

        if (process.platform === "win32" && trayPath.getSize().height > 32) trayPath.resize({ height: 32 });

        tray.setImage(trayPath);
    });

    mainWindow.on("close", async (e) => {
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
    mainWindow.on("focus", () => setBodyAttribute("unFocused"));
    mainWindow.on("blur", () => setBodyAttribute("unFocused", ""));
    mainWindow.on("maximize", () => setBodyAttribute("isMaximized"));
    mainWindow.on("unmaximize", () => setBodyAttribute("isMaximized", ""));

    await mainWindow.loadFile(path.join(__dirname, "/content/splash.html"));
    const disUrl = await getConfig("discordUrl");
    await mainWindow.webContents.executeJavaScript(`window.location.replace("${disUrl}");`).then(async () => {
        if ((await getConfig("modName")) != "none") loadMods();

        await mainWindow.webContents.executeJavaScript(`
                const Logger = window.__SENTRY__.logger
                Logger.disable()
        `);

        await initializeFirewall();
    });
}

export async function createCustomWindow() {
    mainWindow = new BrowserWindow({
        width: 300,
        height: 350,
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
