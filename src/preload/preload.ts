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
sleep(5000).then(async () => {
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
});

const waitForButton = setInterval(() => {
    let settingsButton = document.querySelector('[aria-label="User Settings"]');
    if (settingsButton) {
        clearInterval(waitForButton);
        settingsButton.addEventListener('click', () => {
            inject()
        });
    }
}, 1000);

// 🤮
function inject() {
    console.log("Injecting...")
    const waitForSidebar = setInterval(() => {
        const host = document.querySelector<HTMLDivElement>("nav > [class|=side]");
        if (host != null) {
            clearInterval(waitForSidebar);
            const html =
                "<div class=\"header-2F5_LB\" tabindex=\"-1\" role=\"button\"><div class=\"eyebrow-1Shfyi headerText-10ez_d\" data-text-variant=\"eyebrow\">GoofCord</div></div>" +
                "<div class=\"item-2GWPIy themed-qqoYp3\" role=\"tab\" aria-selected=\"false\" aria-disabled=\"false\" tabindex=\"-1\" data-custom-id=\"settingsButton\">Settings</div>" +
                "<div class=\"separator-2N511j\"></div>"
            host.insertAdjacentHTML('afterbegin', html);

            const settingsButton = host.querySelector('[data-custom-id="settingsButton"]')!;
            settingsButton.addEventListener('click', () => {
                ipcRenderer.send('openSettingsWindow');
            });

            const hostInfo = document.querySelector<HTMLDivElement>("nav > [class|=side] [class|=info]")!;
            const el = hostInfo.firstElementChild!.cloneNode() as HTMLSpanElement;
            el.id = "ac-ver";
            el.textContent = `GoofCord Version: ${version}`;
            hostInfo.insertBefore(el, hostInfo.firstElementChild!);
        }
    }, 500);
}