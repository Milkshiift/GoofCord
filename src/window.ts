// To allow seamless switching between custom titlebar and native os titlebar,
// I had to add most of the window creation code here to split both into seperete functions
// WHY? Because I can't use the same code for both due to annoying bug with value `frame` not responding to variables
// I'm sorry for this mess but I'm not sure how to fix it.
import {app, BrowserWindow, dialog, nativeImage, shell} from "electron";
import {checkIfConfigIsBroken, contentPath, getConfig, setConfig, setWindowState} from "./utils";
import {registerIpc} from "./ipc";
import {setMenu} from "./menu";
import * as fs from "fs";
import contextMenu from "electron-context-menu";
import os from "os";
import {tray} from "./tray";
import {iconPath} from "./main";

const path = require("path");

export let mainWindow: BrowserWindow;
export let inviteWindow: BrowserWindow;

let osType = os.type();
contextMenu({
    showSaveImageAs: true,
    showCopyImageAddress: true,
    showSearchWithGoogle: false,
    showSearchWithDuckDuckGo: true
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
    // A little sloppy but it works :p
    if (osType == "Windows_NT") {
        osType = "Windows " + os.release().split(".")[0] + " (" + os.release() + ")";
    }
    mainWindow.webContents.userAgent = `Mozilla/5.0 (X11; ${osType} ${os.arch()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36`; //fake useragent for screenshare to work
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
        // Allow about:blank (used by Vencord QuickCss popup)
        if (url === "about:blank") return {action: "allow"};
        // Allow Discord stream popout
        if (url === "https://discord.com/popout") return {action: "allow"};
        if (url.startsWith("https:") || url.startsWith("http:") || url.startsWith("mailto:")) {
            shell.openExternal(url);
        } else {
            if (ignoreProtocolWarning) {
                shell.openExternal(url);
            } else {
                const options = {
                    type: "question",
                    buttons: ["Yes, please", "No, I don't"],
                    defaultId: 1,
                    title: url,
                    message: `Do you want to open ${url}?`,
                    detail: "This url was detected to not use normal browser protocols. It could mean that this url leads to a local program on your computer. Please check if you recognise it, before proceeding!",
                    checkboxLabel: "Remember my answer and ignore this warning for future sessions",
                    checkboxChecked: false
                };

                dialog.showMessageBox(mainWindow, options).then(({response, checkboxChecked}) => {
                    console.log(response, checkboxChecked);
                    if (checkboxChecked) {
                        if (response == 0) {
                            setConfig("ignoreProtocolWarning", true);
                        } else {
                            setConfig("ignoreProtocolWarning", false);
                        }
                    }
                    if (response == 0) {
                        shell.openExternal(url);
                    } else {
                        return;
                    }
                });
            }
        }
        return {action: "deny"};
    });
    console.log("Starting screenshare module...");
    import("./screenshare/main");

    //Blocking discords trash
    mainWindow.webContents.session.webRequest.onBeforeRequest(
        {
            urls: [
                "https://*/api/v*/science",
                "https://*/api/v*/metrics",
                "https://*/api/v*/track",
                "https://*/api/v*/promotions/ack",
                "https://*/api/v*/creator-monetization",
                "https://*/api/v*/applications/detectable",
                "https://*/api/v*/users/@me/burst-credits",
                "https://*/api/v*/users/@me/billing/payment-sources",
                "https://*/api/v*/users/@me/billing/country-code",
                "https://sentry.io/*",
                "https://*.nel.cloudflare.com/*"
            ]
        },
        (_, callback) => callback({cancel: true})
    );

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
        const buf = new Buffer(faviconBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        fs.writeFileSync(path.join(app.getPath("temp"), "/", "tray.png"), buf, "utf-8");
        let trayPath = nativeImage.createFromPath(path.join(app.getPath("temp"), "/", "tray.png"));
        if (process.platform === "darwin" && trayPath.getSize().height > 22) trayPath = trayPath.resize({height: 22});
        if (process.platform === "win32" && trayPath.getSize().height > 32) trayPath = trayPath.resize({height: 32});
        tray.setImage(trayPath);
    });
    const userDataPath = app.getPath("userData");
    const themesFolder = userDataPath + "/themes/";
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
    });
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
            spellcheck: true
        }
    });
    mainWindow.maximize();
    doAfterDefiningTheWindow();
}

export function createInviteWindow(code: string) {
    inviteWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: "GoofCord Invite Manager",
        darkTheme: true,
        icon: iconPath,
        frame: true,
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: false,
            spellcheck: true
        }
    });
    const formInviteURL = `https://discord.com/invite/${code}`;
    inviteWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
        if (details.url.includes("ws://")) return callback({cancel: true});
        return callback({});
    });
    inviteWindow.loadURL(formInviteURL);
    inviteWindow.webContents.once("did-finish-load", () => {
        inviteWindow.show();
        inviteWindow.webContents.once("will-navigate", () => {
            inviteWindow.close();
        });
    });
}
