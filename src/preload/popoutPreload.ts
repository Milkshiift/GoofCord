import path from "path";
import {addStyle} from "../utils";
import * as fs from "fs-extra";

addEventListener("DOMContentLoaded", () => {injectTitlebar();});

let titlebar: HTMLDivElement;
function createTitlebar() {
    titlebar = document.createElement("div");
    titlebar.innerHTML = `
        <nav class="titlebar">
          <div id="window-controls-container">
            <div id="spacer"></div>
            <div id="quit" onclick="window.close()"></div>
          </div>
        </nav>
    `;
    titlebar.classList.add("withFrame-haYltI");
    return titlebar;
}

export async function injectTitlebar() {
    const titlebar = createTitlebar();
    const appMount = document.getElementById("app-mount");
    const titlebarcssPath = path.join(__dirname, "../", "/assets/css/titlebarSlim.css");
    addStyle(await fs.promises.readFile(titlebarcssPath, "utf8"));
    appMount?.prepend(titlebar);
}