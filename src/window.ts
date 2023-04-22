import {app, BrowserWindow, dialog, nativeImage, session, shell} from "electron";
import {checkIfConfigIsBroken, contentPath, getConfig, setConfig, setWindowState} from "./utils";
import {registerIpc} from "./ipc";
import {setMenu} from "./menu";
import * as fs from "fs";
import contextMenu from "electron-context-menu";
import {tray} from "./tray";
import {iconPath} from "./main";
import {loadMods} from "./extensions/plugin";

const path = require("path");

export let mainWindow: BrowserWindow;
//let osType = os.type();
contextMenu({
    showSaveImageAs: true,
    showCopyImageAddress: true,
    showSearchWithGoogle: false
    //showSearchWithDuckDuckGo: true
});

async function doAfterDefiningTheWindow() {
    if (await getConfig("startMinimized")) {
        mainWindow.hide();
    } else {
        mainWindow.show();
    }
    const ignoreProtocolWarning = await getConfig("ignoreProtocolWarning");
    await checkIfConfigIsBroken();
    registerIpc();
    mainWindow.webContents.userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
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
    const userDataPath = app.getPath("userData");
    /*const themesFolder = userDataPath + "/themes/";
    if (!fs.existsSync(themesFolder)) {
        fs.mkdirSync(themesFolder);
        console.log("Created missing theme folder");
    }
    mainWindow.webContents.on("did-finish-load", () => {
        fs.readdirSync(themesFolder).forEach((file) => {
            try {
                const manifest = fs.readFileSync(`${themesFolder}/${file}/manifest.json`, "utf8");
                const themeFile = JSON.parse(manifest);
                mainWindow.webContents.send(
                    "themeLoader",
                    fs.readFileSync(`${themesFolder}/${file}/${themeFile.theme}`, "utf-8")
                );
                console.log(`%cLoaded ${themeFile.name} made by ${themeFile.author}`, "color:red");
            } catch (err) {
                console.error(err);
            }
        });
    });*/
    await setMenu();
    mainWindow.on("close", async (e) => {
        let [width, height] = mainWindow.getSize();
        await setWindowState({
            width: width,
            height: height,
            isMaximized: mainWindow.isMaximized(),
            x: mainWindow.getPosition()[0],
            y: mainWindow.getPosition()[1]
        });
        if (await getConfig("minimizeToTray")) {
            e.preventDefault();
            mainWindow.hide();
        } else if (!(await getConfig("minimizeToTray"))) {
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
    console.log(contentPath);
    await mainWindow.loadFile(path.join(__dirname, "/content/splash.html"));
    if (await getConfig("startMinimized")) {
        mainWindow.hide();
    } else {
        mainWindow.show();
    }
    // Loading discord and changing doctype to html
    await mainWindow.webContents.executeJavaScript(`
        window.location.replace("https://canary.discord.com/app");
    `).then(async () => {
        loadMods();
        const whiteList = await getConfig("whitelist");
        const regexList = whiteList.map((url: string) => new RegExp(`^${url.replace(/\*/g, '.*')}`));

        session.defaultSession.webRequest.onBeforeSendHeaders({urls: ["<all_urls>"]}, (details, callback) => {
            const requestUrl = new URL(details.url);
            const isAllowedUrl = regexList.some((regex: RegExp) => regex.test(requestUrl.href));
            const headers = details.requestHeaders;
            const blockedHeaders = ["Referer"];

            if (!isAllowedUrl) {
                callback({cancel: true});
            } else {
                for (const blockedHeader of blockedHeaders) {
                    if (headers[blockedHeader]) {
                        delete headers[blockedHeader];
                    }
                }
                callback({requestHeaders: headers});
            }
        });
    })
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
            //preload: path.resolve(app.getAppPath(), 'preload/preload.js'),
            preload: path.join(__dirname, "preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false, // https://electronjs.org/docs/tutorial/security#2-do-not-enable-nodejs-integration-for-remote-content
            webviewTag: true,
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            enableWebSQL: false,
            webgl: false,
            safeDialogs: true, // prevents dialog spam by the website
            autoplayPolicy: "no-user-gesture-required",
            plugins: true,
            spellcheck: true,
            devTools: true, // Allows the use of the devTools.
            experimentalFeatures: false
        }
    });

    mainWindow.maximize();
    doAfterDefiningTheWindow();
}
