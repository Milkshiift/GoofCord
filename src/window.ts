import {app, BrowserWindow, ipcRenderer, nativeImage, session, shell} from "electron";
import {checkIfConfigIsBroken, getConfig, setWindowState} from "./utils";
import {registerIpc} from "./ipc";
import {setMenu} from "./menu";
import * as fs from "fs";
import contextMenu from "electron-context-menu";
import {tray} from "./tray";
import {iconPath} from "./main";
import {loadMods} from "./extensions/plugin";
import {getUserAgent} from "./modules/agent";

const path = require("path");

export let mainWindow: BrowserWindow;
contextMenu({
    showSaveImageAs: true,
    showCopyImageAddress: true,
    showSearchWithGoogle: false
});

async function doAfterDefiningTheWindow() {
    if (await getConfig("startMinimized")) {
        mainWindow.hide();
    } else {
        mainWindow.show();
    }
    await checkIfConfigIsBroken();
    registerIpc();
    await setMenu();
    mainWindow.webContents.userAgent = getUserAgent(process.versions.chrome);
    app.on("second-instance", (event, commandLine, workingDirectory, additionalData) => {
        // Print out data received from the second instance.
        console.log(additionalData);

        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    mainWindow.webContents.setWindowOpenHandler(({url}) => {
        if (url === "about:blank") return { action: "allow" }
        if (url.startsWith("https:") || url.startsWith("http:") || url.startsWith("mailto:")) {
            shell.openExternal(url);
        }
        return {action: "deny"};
    });

    console.log("Starting screenshare module...");
    import("./screenshare/main");

    mainWindow.webContents.on("page-favicon-updated", async () => {
        const faviconBase64 = await mainWindow.webContents.executeJavaScript(`
            var getFavicon = function(){
            var favicon = undefined;
            var nodeList = document.getElementsByTagName("link");
            for (var i = 0; i < nodeList.length; i++)
            {
                if((nodeList[i].getAttribute("rel") == "icon")||(nodeList[i].getAttribute("rel") == "shortcut icon"))
                {
                    favicon = nodeList[i].getAttribute("href");
                }
            }
            return favicon;
            }
            getFavicon()
        `);
        const buf = Buffer.alloc(
            Buffer.byteLength(faviconBase64.replace(/^data:image\/\w+;base64,/, ""), "base64"),
            faviconBase64.replace(/^data:image\/\w+;base64,/, ""),
            "base64"
        );
        fs.writeFileSync(path.join(app.getPath("temp"), "/", "tray.png"), buf, "utf-8");
        let trayPath = nativeImage.createFromPath(path.join(app.getPath("temp"), "/", "tray.png"));
        if (process.platform === "darwin" && trayPath.getSize().height > 22) trayPath = trayPath.resize({height: 22});
        if (process.platform === "win32" && trayPath.getSize().height > 32) trayPath = trayPath.resize({height: 32});
        tray.setImage(trayPath);
    });
    mainWindow.on("close", async (e) => {
        let [width, height] = mainWindow.getSize();
        await setWindowState({
            width: width,
            height: height,
            isMaximized: mainWindow.isMaximized(),
            x: mainWindow.getPosition()[0],
            y: mainWindow.getPosition()[1]
        });
        let minim = await getConfig("minimizeToTray");
        if (minim) {
            e.preventDefault();
            mainWindow.hide();
        } else {
            e.preventDefault();
            app.quit();
        }
    });
    mainWindow.on("focus", () => {
        mainWindow.webContents.executeJavaScript(`document.body.removeAttribute("unFocused");`);
    });
    mainWindow.on("blur", () => {
        mainWindow.webContents.executeJavaScript(`document.body.setAttribute("unFocused", "");`);
    });
    mainWindow.on("maximize", () => {
        mainWindow.webContents.executeJavaScript(`document.body.setAttribute("isMaximized", "");`);
    });
    mainWindow.on("unmaximize", () => {
        mainWindow.webContents.executeJavaScript(`document.body.removeAttribute("isMaximized");`);
    });

    await mainWindow.loadFile(path.join(__dirname, "/content/splash.html"));
    const disUrl = await getConfig("discordUrl");
    await mainWindow.webContents
        .executeJavaScript(`window.location.replace("${disUrl}");`)
        .then(async () => {
            if (await getConfig("modName") != "none") {loadMods()}

            await mainWindow.webContents.executeJavaScript(`
                const Logger = window.__SENTRY__.logger
                Logger.disable()
            `);

            session.defaultSession.webRequest.onBeforeRequest(
                {urls: [
                        "https://*/api/v*/science",
                        "https://sentry.io/*",
                        "https://*.nel.cloudflare.com/*",
                        "https://*/api/v*/applications/detectable",
                        "https://*/api/v*/auth/location-metadata",
                        "https://cdn.discordapp.com/bad-domains/updated_hashes.json"
                    ]},
                (_, callback) => callback({cancel: true})
            );
        });
}

export async function createCustomWindow() {
    mainWindow = new BrowserWindow({
        width: 300,
        height: 350,
        title: "GoofCord",
        show: false,
        darkTheme: true,
        icon: iconPath,
        frame: false,
        backgroundColor: "#202225",
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: false,
            preload: path.join(__dirname, "preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false, // https://electronjs.org/docs/tutorial/security#2-do-not-enable-nodejs-integration-for-remote-content
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            enableWebSQL: false,
            autoplayPolicy: "no-user-gesture-required",
            plugins: true,
            spellcheck: await getConfig("spellcheck"),
            devTools: true // Allows the use of the devTools.
        }
    });

    mainWindow.maximize();
    await doAfterDefiningTheWindow();
}
