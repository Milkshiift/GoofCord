import fs from "node:fs/promises";
import { ipcRenderer, webFrame } from "electron";

let titlebar: HTMLDivElement;
function createTitlebar() {
	titlebar = document.createElement("div");
	titlebar.innerHTML = `
		<p class="titlebar-text"></p>
        <nav class="titlebar">
          <div class="window-title" id="window-title"></div>
          <div id="window-controls-container">
            <div id="minimize"></div>
            <div id="maximize"></div>
            <div id="quit"></div>
          </div>
        </nav>
    `;
	titlebar.classList.add("withFrame-haYltI");
	return titlebar;
}

async function attachTitlebarEvents(titlebar: HTMLDivElement) {
	const minimize = titlebar.querySelector("#minimize");
	const maximize = titlebar.querySelector("#maximize");
	const quit = titlebar.querySelector("#quit");

	minimize?.addEventListener("click", () => {
		void ipcRenderer.invoke("window:Minimize");
	});

	const isMaximized = await ipcRenderer.invoke("window:IsMaximized");
	if (maximize && isMaximized) maximize.id = "maximized";
	maximize?.addEventListener("click", async () => {
		const isMaximized = await ipcRenderer.invoke("window:IsMaximized");
		if (isMaximized) {
			void ipcRenderer.invoke("window:Unmaximize");
			maximize.id = "maximize";
		} else {
			void ipcRenderer.invoke("window:Maximize");
			maximize.id = "maximized";
		}
	});

	quit?.addEventListener("click", () => {
		void ipcRenderer.invoke("window:Quit");
	});
}

export async function injectTitlebar() {
	const titlebar = createTitlebar();

	const appMount = document.getElementById("app-mount");
	if (!appMount) return;

	appMount.prepend(titlebar);

	// MutationObserver to check if the title bar gets destroyed
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			const removedNodes = Array.from(mutation.removedNodes);
			if (removedNodes.includes(titlebar)) {
				console.log("Reinjecting titlebar");
				injectTitlebar().catch((error) => console.error("Error reinjecting titlebar:", error));
				break;
			}
		}
	});
	observer.observe(appMount, { childList: true, subtree: false });

	if (!ipcRenderer.sendSync("config:getConfig", "customTitlebar")) {
		const infoOnlyTitlebarCss = await fs.readFile(ipcRenderer.sendSync("utils:getAsset", "css/infoOnlyTitlebar.css"), "utf8");
		webFrame.insertCSS(infoOnlyTitlebarCss);
	}
	const titlebarCss = await fs.readFile(ipcRenderer.sendSync("utils:getAsset", "css/titlebar.css"), "utf8");
	webFrame.insertCSS(titlebarCss);

	await attachTitlebarEvents(titlebar);
}

let animFinished = true;
export function flashTitlebar(color: string) {
	const realTitlebar = titlebar.children[1] as HTMLElement;
	const originalColor = realTitlebar.style.backgroundColor;

	if (!animFinished) {
		realTitlebar.style.backgroundColor = originalColor;
		realTitlebar.removeEventListener("transitionend", handler);
	}
	animFinished = false;

	realTitlebar.style.backgroundColor = color;
	realTitlebar.addEventListener("transitionend", handler);
	function handler() {
		realTitlebar.style.backgroundColor = originalColor;
		animFinished = true;
		realTitlebar.removeEventListener("transitionend", handler);
	}
}

let titlebarTimeout: Timer;
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
