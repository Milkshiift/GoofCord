import fs from "node:fs/promises";
import { ipcRenderer, webFrame } from "electron";

let titlebar: HTMLElement;

async function attachControlsEvents(container: Element) {
	const minimize = container.querySelector("#minimize");
	const maximize = container.querySelector("#maximize");
	const quit = container.querySelector("#quit");

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
	const titlebarCss = fs.readFile(ipcRenderer.sendSync("utils:getAsset", "css/titlebar.css"), "utf8");

	while (!document.querySelector('[data-windows]')) {
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	const bar = document.querySelector('[data-windows]');
	if (!bar) return;
	titlebar = bar as HTMLElement;
	const leading = titlebar.querySelector('[class^="leading"]');
	const title = titlebar.querySelector('[class^="title"]');
	const trailing = titlebar.querySelector('[class^="trailing"]');
	if (!leading || !title || !trailing) return;

	const titlebarText = document.createElement("p");
	titlebarText.id = "titlebar-text";
	title.prepend(titlebarText);

	if (ipcRenderer.sendSync("config:getConfig", "customTitlebar")) {
		const wordmark = document.createElement("div");
		wordmark.id = "window-title";
		leading.prepend(wordmark);

		const controlsFiller = document.createElement('div');
		controlsFiller.id = "window-controls-filler";
		trailing.append(controlsFiller);

		const appMount = document.getElementById("app-mount");
		if (appMount) {
			const controls = document.createElement('div');
			controls.id = "window-controls-container";
			controls.innerHTML = '<div id="minimize"></div><div id="maximize"></div><div id="quit"></div>';
			appMount.prepend(controls);
			void attachControlsEvents(controls);
		}
	}

	webFrame.insertCSS(await titlebarCss);
}

let animFinished = true;
export function flashTitlebar(color: string) {
	const originalColor = titlebar.style.backgroundColor;

	if (!animFinished) {
		titlebar.style.backgroundColor = originalColor;
		titlebar.removeEventListener("transitionend", handler);
	}
	animFinished = false;

	titlebar.style.backgroundColor = color;
	titlebar.addEventListener("transitionend", handler);
	function handler() {
		titlebar.style.backgroundColor = originalColor;
		animFinished = true;
		titlebar.removeEventListener("transitionend", handler);
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
