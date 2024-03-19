// RENDERER
import "./bridge";
import {ipcRenderer} from "electron";
import * as path from "path";
import {addScript, addStyle} from "../utils";
import {injectTitlebar} from "./titlebar";
import {log} from "../modules/logger";
import {loadScripts} from "../scriptLoader/scriptLoader";
import fs from "fs";
import {getConfig} from "../config";

(async () => {
    // For some reason, preload is called before the document.body is accessible
    // So we wait until it's not null
    while (document.body === null || !document.location.href.includes("https")) {
        await new Promise(resolve => setTimeout(resolve, 5));
    }
    loadScripts(false);
    injectTitlebar();
})();

const waitUntilSplashEnds = setInterval(async () => {
    // Waiting until settings button appears, also useful for detecting when the splash is over
    const settingsButtonSvg = document.querySelector("g[clip-path='url(#__lottie_element_100)']");
    if (settingsButtonSvg != null) {
        clearInterval(waitUntilSplashEnds);

        const settingsButton = settingsButtonSvg.parentElement!.parentElement!.parentElement!.parentElement!;

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

            const header = host.querySelectorAll("div > [class*=header_]")!;
            const button = host.querySelectorAll("div > [class*=item_]")!;
            const separator = host.querySelectorAll("div > [class*=separator_]")!;

            const headerClone = header[header.length - 1].cloneNode(true) as HTMLElement;
            const buttonClone = button[button.length - 1].cloneNode(true) as HTMLElement;
            const separatorClone = separator[separator.length - 1].cloneNode(true) as HTMLElement;

            headerClone.children[0].innerHTML = "GoofCord";
            buttonClone.textContent = "Settings";
            buttonClone.id = "goofcord";
            buttonClone.onclick = () => ipcRenderer.invoke("openSettingsWindow");

            host.insertAdjacentElement("afterbegin", headerClone);
            headerClone.insertAdjacentElement("afterend", buttonClone);
            buttonClone.insertAdjacentElement("afterend", separatorClone);

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

    // Hide "Download Discord Desktop now!" banner
    window.localStorage.setItem("hideNag", "true");

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

    if (getConfig("disableAutogain")) {
        addScript(await fs.promises.readFile(path.join(__dirname, "../", "/assets/js/disableAutogain.js"), "utf8"));
    }
    if (getConfig("arrpc")) {
        addScript(await fs.promises.readFile(path.join(__dirname, "../", "/assets/js/rpc.js"), "utf8"));
    }

    addStyle(await fs.promises.readFile(path.join(__dirname, "../", "/assets/css/discord.css"), "utf8"));
}
