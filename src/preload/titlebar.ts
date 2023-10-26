import {ipcRenderer} from "electron";
import {addStyle} from "../utils";
import * as fs from "graceful-fs";
import * as path from "path";
import os from "os";

function createTitlebar() {
    const titlebar = document.createElement("div");
    titlebar.innerHTML = `
        <nav class="titlebar">
          <div class="window-title" id="window-title"></div>
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

function attachTitlebarEvents() {
    const titlebar = document.querySelector(".titlebar");
    if (!titlebar) return;

    const minimize = titlebar.querySelector("#minimize")!;
    const maximize = titlebar.querySelector("#maximize")!;
    const quit = titlebar.querySelector("#quit")!;

    minimize.addEventListener("click", () => {
        ipcRenderer.send("win-minimize");
    });

    maximize.addEventListener("click", () => {
        const isMaximized = ipcRenderer.sendSync("win-isMaximized");
        if (isMaximized) {
            ipcRenderer.send("win-unmaximize");
            document.body.removeAttribute("isMaximized");
        } else {
            ipcRenderer.send("win-maximize");
        }
    });

    quit.addEventListener("click", () => {
        const minimizeToTray = ipcRenderer.sendSync("minimizeToTray");
        if (minimizeToTray) {
            ipcRenderer.send("win-hide");
        } else {
            ipcRenderer.send("win-quit");
        }
    });
}

export async function injectTitlebar() {
    const titlebar = createTitlebar();
    const appMount = document.getElementById("app-mount");
    if (appMount) {
        appMount.prepend(titlebar);
    } else {
        document.body.appendChild(titlebar);
    }

    const titlebarcssPath = path.join(__dirname, "../", "/content/css/titlebar.css");
    addStyle(await fs.promises.readFile(titlebarcssPath, "utf8"));
    document.body.setAttribute("customTitlebar", "");
    document.body.setAttribute("goofcord-platform", os.platform());

    attachTitlebarEvents();
}