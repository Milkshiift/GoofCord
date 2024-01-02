import "./bridge";
import {ipcRenderer} from "electron";
import * as fs from "fs-extra";
import * as path from "path";
import {addScript, addStyle, getConfig} from "../utils";
import {injectTitlebar} from "./titlebar";
import "../modules/scriptLoader/scriptLoader";
import {log} from "../modules/logger";
import {loadScripts} from "../modules/scriptLoader/scriptLoader";

window.localStorage.setItem("hideNag", "true");

(async function loadWithCheck() {
    // For some reason, preload is called before the document.body is accessible
    // So we wait until it's not null
    while (document.body === null) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    loadScripts(false);
})();

setTimeout(() => {
    injectTitlebar();
}, 1000);

const waitUntilSplashEnds = setInterval(async () => {
    // Waiting until settings button appears, also useful for detecting when the splash is over
    const settingsButtonSvg = document.querySelectorAll("path[d^='M10.56']");
    const settingsButton = settingsButtonSvg[settingsButtonSvg.length-1]?.parentElement?.parentElement?.parentElement;
    if (settingsButton?.tagName === "BUTTON") {
        clearInterval(waitUntilSplashEnds);

        settingsButton.addEventListener("click", () => {
            injectInSettings();
        });

        loadScripts(true);
        injectAfterSplash();
    }
}, 1000);

function injectInSettings() {
    log("Injecting in settings...");
    const version = ipcRenderer.sendSync("displayVersion");
    const waitForSidebar = setInterval(() => {
        // Wait until the sidebar appears
        const host = document.querySelector<HTMLDivElement>("div[class^='side_']");
        if (host != null) {
            // if the element is found
            clearInterval(waitForSidebar);

            // Finding elements to clone
            const header = host.querySelectorAll("div > [class*=header_]")!;
            const button = host.querySelectorAll("div > [class*=item_]")!;
            const separator = host.querySelectorAll("div > [class*=separator_]")!;
            // Cloning and modifying parameters
            const headerClone = header[header.length - 1].cloneNode(true) as HTMLElement;
            headerClone.children[0].innerHTML = "GoofCord";
            const gcSettings = button[button.length - 1].cloneNode(true) as HTMLElement;
            gcSettings.textContent = "Settings";
            gcSettings.id = "goofcord";
            gcSettings.onclick = () => ipcRenderer.send("openSettingsWindow");
            const separatorClone = separator[separator.length - 1].cloneNode(true) as HTMLElement;
            // Inserting cloned elements
            host.insertAdjacentElement("afterbegin", headerClone);
            headerClone.insertAdjacentElement("afterend", gcSettings);
            gcSettings.insertAdjacentElement("afterend", separatorClone);

            // Inject goofcord version in the settings info element
            const hostInfo = host.querySelector<HTMLDivElement>("div[class^='info_']")!;
            const el = hostInfo.firstElementChild!.cloneNode() as HTMLSpanElement;
            el.textContent = `GoofCord ${version}`;
            hostInfo.insertBefore(el, hostInfo.firstElementChild!);
        }
    }, 100);
}

async function injectAfterSplash() {
    log("Injecting after splash...");
    // dirty hack to make clicking notifications focus GoofCord
    addScript(`
        (() => {
        const originalSetter = Object.getOwnPropertyDescriptor(Notification.prototype, "onclick").set;
        Object.defineProperty(Notification.prototype, "onclick", {
            set(onClick) {
            originalSetter.call(this, function() {
                onClick.apply(this, arguments);
                goofcord.window.show();
                goofcord.window.maximize();
            })
            },
            configurable: true
        });
        })();
    `);
    if (await getConfig("disableAutogain")) {
        addScript(await fs.promises.readFile(path.join(__dirname, "../", "/content/js/disableAutogain.js"), "utf8"));
    }

    const cssPath = path.join(__dirname, "../", "/content/css/discord.css");
    addStyle(await fs.promises.readFile(cssPath, "utf8"));
}
