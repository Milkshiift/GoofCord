import {ipcRenderer} from "electron";
import {addStyle} from "../utils";
import * as fs from "fs-extra";
import * as path from "path";
import os from "os";
import {getConfig} from "../config/config";

let titlebar: HTMLDivElement;
function createTitlebar() {
    titlebar = document.createElement("div");
    titlebar.innerHTML = `
        <nav class="titlebar">
          <div class="window-title" id="window-title"></div>
          <p class="titlebar-text"></p>
          <div id="window-controls-container">
            <div id="spacer"></div>
            <div id="minimize"><div id="minimize-icon"></div></div>
            <div id="maximize"><div id="maximize-icon"></div></div>
            <div id="quit"><div id="quit-icon"></div></div>
          </div>
        </nav>
    `;
    titlebar.classList.add("withFrame-haYltI");
    return titlebar;
}

function attachTitlebarEvents(titlebar: HTMLDivElement) {
    const minimize = titlebar.querySelector("#minimize")!;
    const maximize = titlebar.querySelector("#maximize")!;
    const quit = titlebar.querySelector("#quit")!;

    minimize.addEventListener("click", () => {
        ipcRenderer.send("window:Minimize");
    });

    maximize.addEventListener("click", () => {
        const isMaximized = ipcRenderer.sendSync("window:IsMaximized");
        if (isMaximized) {
            ipcRenderer.send("window:Unmaximize");
            document.body.removeAttribute("isMaximized");
        } else {
            ipcRenderer.send("window:Maximize");
        }
    });

    quit.addEventListener("click", () => {
        const minimizeToTraySetting = ipcRenderer.sendSync("minimizeToTraySetting");
        if (minimizeToTraySetting) {
            ipcRenderer.send("window:Hide");
        } else {
            ipcRenderer.send("window:Quit");
        }
    });
}

export async function injectTitlebar() {
    const titlebar = createTitlebar();
    const appMount = document.getElementById("app-mount")!;
    appMount.prepend(titlebar);

    // MutationObserver to check if the title bar gets destroyed
    const observer = new MutationObserver(function(mutations) {
        for (let i = 0; i < mutations.length; i++) {
            const removedNodes = Array.from(mutations[i].removedNodes);
            if (removedNodes.includes(titlebar)) {
                // Titlebar has been removed, reinject it
                injectTitlebar();
                break;
            }
        }
    });

    observer.observe(appMount, { childList: true, subtree: false });

    if (!await getConfig("framelessWindow")) {
        const minimalTitlebarCssPath = path.join(__dirname, "../", "/assets/css/minimalTitlebar.css");
        addStyle(await fs.promises.readFile(minimalTitlebarCssPath, "utf8"));
    }
    const titlebarCssPath = path.join(__dirname, "../", "/assets/css/titlebar.css");
    addStyle(await fs.promises.readFile(titlebarCssPath, "utf8"));

    document.body.setAttribute("goofcord-platform", os.platform());

    attachTitlebarEvents(titlebar);
}

let animFinished = true;
export function flashTitlebar(color: string) {
    const realTitlebar = titlebar.children[0] as HTMLElement;

    if (!animFinished) {
        realTitlebar.style.backgroundColor = "transparent";
        realTitlebar.removeEventListener("transitionend", handler);
    }
    animFinished = false;

    realTitlebar.style.backgroundColor = color;
    realTitlebar.addEventListener("transitionend", handler);
    function handler() {
        realTitlebar.style.backgroundColor = "transparent";
        animFinished = true;
        realTitlebar.removeEventListener("transitionend", handler);
    }
}

let titlebarTimeout: NodeJS.Timeout | null = null;
export function flashTitlebarWithText(color: string, text: string) {
    flashTitlebar(color);

    const titlebarText = titlebar.getElementsByTagName("p")[0];
    titlebarText.innerHTML = text;
    titlebarText.style.transition = "opacity 0.2s ease-out";
    titlebarText.style.opacity = "1";

    // Clear the previous timeout if it exists
    if (titlebarTimeout) {
        clearTimeout(titlebarTimeout);
    }

    titlebarTimeout = setTimeout(() => {
        titlebarText.style.transition = "opacity 2s ease-out";
        titlebarText.style.opacity = "0";
    }, 4000);
}