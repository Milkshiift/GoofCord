import "./bridge";
import "./optimizer";
import {ipcRenderer} from "electron";
import * as fs from "fs";
import * as path from "path";
import {addScript, addStyle, sleep} from "../utils";
import {fixTitlebar, injectTitlebar} from "./titlebar";

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
        settingsButton.addEventListener('click', () => {
            injectInSettings();
        });

        injectAfterSplash();
    }
}, 1000);

// 🤮
function injectInSettings() {
    console.log("Injecting in settings...")
    const waitForSidebar = setInterval(() => { // Wait until sidebar appears
        const host = document.querySelector<HTMLDivElement>("nav > [class|=side]"); // select the HTML element where settings buttons will be injected
        if (host != null) { // if the element is found
            clearInterval(waitForSidebar); // stop running the setInterval function
            const html = // create HTML code to be injected in the settings
                "<div class=\"header-goof theme-dark\" tabindex=\"-1\" role=\"button\"><div class=\"headerText-goof theme-dark\">GoofCord</div></div>" +
                "<div class=\"item-goof theme-dark\" role=\"tab\" aria-selected=\"false\" aria-disabled=\"false\" tabindex=\"-1\" data-custom-id=\"settingsButton\">Settings</div>" +
                "<div class=\"separator-goof theme-dark\"></div>"
            host.insertAdjacentHTML('afterbegin', html); // inject the HTML code at the beginning of the settings sidebar element

            const settingsButton = host.querySelector('[data-custom-id="settingsButton"]')!; // select the settings button from the injected HTML
            settingsButton.addEventListener('click', () => {
                ipcRenderer.send('openSettingsWindow'); // when the button is clicked, open the settings window
            });

            // Inject goofcord version in the settings info element
            const hostInfo = document.querySelector<HTMLDivElement>("nav > [class|=side] [class|=info]")!;
            const el = hostInfo.firstElementChild!.cloneNode() as HTMLSpanElement;
            el.id = "ac-ver";
            el.textContent = `GoofCord Version: ${version}`;
            hostInfo.insertBefore(el, hostInfo.firstElementChild!);
        }
    }, 100);
}

function injectAfterSplash() {
    console.log("Injecting after splash...")
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