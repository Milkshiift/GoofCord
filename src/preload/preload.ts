import "./bridge";
import {ipcRenderer} from "electron";
import * as fs from "fs";
import * as path from "path";
import {addScript, addStyle} from "../utils";
import {fixTitlebar, injectTitlebar} from "./titlebar";
import "./optimizer";

window.localStorage.setItem("hideNag", "true");
ipcRenderer.on("themeLoader", (event, message) => {
    addStyle(message);
});
if (ipcRenderer.sendSync("titlebar")) {
    injectTitlebar();
}
const version = ipcRenderer.sendSync("displayVersion");

const waitForButton = setInterval(() => {
    // Waiting until settings button appears, also useful for detecting when splash is over
    let settingsButton = document.querySelector('[aria-label="User Settings"]');
    if (settingsButton) {
        clearInterval(waitForButton);
        settingsButton.addEventListener("click", () => {
            injectInSettings();
        });

        injectAfterSplash();
    }
}, 1000);

function injectInSettings() {
    console.log("Injecting in settings...");
    const waitForSidebar = setInterval(() => {
        // Wait until sidebar appears
        const host = document.querySelector<HTMLDivElement>("nav > [class|=side]");
        if (host != null) {
            // if the element is found
            clearInterval(waitForSidebar); // stop running the setInterval function

            // Finding elements to clone
            let header = document.querySelectorAll("div > [class*=header-]")!;
            let button = document.querySelectorAll("div > [class*=item-]")!;
            let separator = document.querySelectorAll("div > [class*=separator-]")!;
            console.log(separator);
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
            const hostInfo = document.querySelector<HTMLDivElement>("nav > [class|=side] [class|=info]")!;
            const el = hostInfo.firstElementChild!.cloneNode() as HTMLSpanElement;
            el.id = "ac-ver";
            el.textContent = `GoofCord ${version}`;
            hostInfo.insertBefore(el, hostInfo.firstElementChild!);
        }
    }, 100);
}

function injectAfterSplash() {
    console.log("Injecting after splash...");
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
    const cssPath = path.join(__dirname, "../", "/content/css/discord.css");
    addStyle(fs.readFileSync(cssPath, "utf8"));
    if (document.getElementById("window-controls-container") == null) {
        console.warn("Titlebar didn't inject, retrying...");
        if (ipcRenderer.sendSync("titlebar")) {
            fixTitlebar();
        }
    }
}
