import path from "path";
import {addStyle} from "../utils";
import * as fs from "fs-extra";

(async function waitForBody() {
    while (document.body === null) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    load();
})();

async function load() {
    injectTitlebar();
}

let titlebar: HTMLDivElement;
function createTitlebar() {
    titlebar = document.createElement("div");
    titlebar.innerHTML = `
        <nav class="titlebar">
          <div id="window-controls-container">
            <div id="spacer"></div>
            <div id="quit"></div>
          </div>
        </nav>
    `;
    titlebar.classList.add("withFrame-haYltI");
    return titlebar;
}

function attachTitlebarEvents() {
    if (!titlebar) return;

    const quit = titlebar.querySelector("#quit")!;
    quit.addEventListener("click", () => {
        window.close();
    });
}

export async function injectTitlebar() {
    const titlebar = createTitlebar();
    const appMount = document.getElementById("app-mount");
    if (appMount) appMount.prepend(titlebar);
    const titlebarcssPath = path.join(__dirname, "../", "/assets/css/titlebarSlim.css");
    addStyle(await fs.promises.readFile(titlebarcssPath, "utf8"));
    attachTitlebarEvents();
}