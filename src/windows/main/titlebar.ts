import fs from "node:fs/promises";
import { ipcRenderer, webFrame } from "electron";

interface TitlebarElements {
	titlebar: HTMLElement | null;
	controls: HTMLElement | null;
	dragBar: HTMLElement | null;
	titlebarText: HTMLElement | null;
}

const elements: TitlebarElements = {
	titlebar: null,
	controls: null,
	dragBar: null,
	titlebarText: null
};

const customTitlebarEnabled = ipcRenderer.sendSync("config:getConfig", "customTitlebar");

async function attachControlsEvents(container: Element): Promise<void> {
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

function addCustomTitlebar(): void {
	elements.titlebarText = document.createElement("p");
	elements.titlebarText.id = "titlebar-text";
	document.body.prepend(elements.titlebarText);

	elements.dragBar = document.createElement('div');
	elements.dragBar.id = "dragbar";

	if (customTitlebarEnabled) {
		elements.dragBar.style.setProperty('-webkit-app-region', 'drag');

		elements.controls = document.createElement('div');
		elements.controls.id = "window-controls-container";
		elements.controls.innerHTML = '<div id="minimize"></div><div id="maximize"></div><div id="quit"></div>';
		document.body.prepend(elements.controls);
		void attachControlsEvents(elements.controls);
	}

	document.body.prepend(elements.dragBar);
}

function modifyDiscordBar(): void {
	if (!customTitlebarEnabled) return;

	const bar = document.querySelector('div[class^="bar_"]:has(>[class^="title_"])');
	if (!bar) {
		console.error("Failed to find Discord title bar");
		return;
	}
	elements.titlebar = bar as HTMLElement;

	// trigger CSS rules that show custom titlebar
	bar.setAttribute("__goofcord-custom-titlebar", "true");
}

export async function injectTitlebar(): Promise<void> {
	document.addEventListener("DOMContentLoaded", async () => {
		addCustomTitlebar();

		const observer = new MutationObserver(checkMainLayer);
		observer.observe(document.body, {childList: true, subtree: true});

		// Initial check
		checkMainLayer();

		try {
			const cssPath = ipcRenderer.sendSync("utils:getAsset", "css/titlebar.css");
			const cssContent = await fs.readFile(cssPath, "utf8");
			webFrame.insertCSS(cssContent);
		} catch (error) {
			console.error('Failed to load titlebar CSS:', error);
		}
	});
}

function checkMainLayer(): void {
	if (!elements.dragBar) return;

	// mainLayer is a parent of the Discord top bar. If it's hidden, show the drag bar as a fallback
	const mainLayer = document.querySelector('[aria-hidden][class^="layer_"]');

	if (!mainLayer) {
		elements.dragBar.style.display = "block";
	} else {
		elements.dragBar.style.display = mainLayer.getAttribute('aria-hidden') === "true" ? "block" : "none";

		// `elements.titlebar` may be uninitialized or may have been deleted from the document
		// (due to switching accounts etc.) so we check it
		if (!mainLayer.contains(elements.titlebar)) modifyDiscordBar();
	}
}

let animationInProgress = false;
let titlebarTimeout: NodeJS.Timeout;
let originalTitlebarColor = "";
let originalDragbarColor = "";

export function flashTitlebar(color: string): void {
	if (!elements.titlebar || !elements.dragBar) return;

	originalTitlebarColor = originalTitlebarColor ?? elements.titlebar.style.backgroundColor;
	originalDragbarColor = originalDragbarColor ?? elements.dragBar.style.backgroundColor;

	// Cancel any ongoing animation
	if (animationInProgress) {
		resetTitlebarColors(originalTitlebarColor, originalDragbarColor);
	}

	animationInProgress = true;

	elements.titlebar.style.backgroundColor = color;
	elements.dragBar.style.backgroundColor = color;

	const handleTransitionEnd = () => {
		resetTitlebarColors(originalTitlebarColor, originalDragbarColor);
	};

	elements.titlebar.addEventListener("transitionend", handleTransitionEnd, { once: true });
	elements.dragBar.addEventListener("transitionend", handleTransitionEnd, { once: true });
}

function resetTitlebarColors(titlebarColor: string, dragbarColor: string): void {
	if (!elements.titlebar || !elements.dragBar) return;

	elements.titlebar.style.backgroundColor = titlebarColor;
	elements.dragBar.style.backgroundColor = dragbarColor;
	animationInProgress = false;
}

export function flashTitlebarWithText(color: string, text: string): void {
	flashTitlebar(color);

	if (!elements.titlebarText) return;

	elements.titlebarText.innerHTML = text;
	elements.titlebarText.style.transition = "opacity 0.2s ease-out";
	elements.titlebarText.style.opacity = "1";

	// Clear the previous timeout if it exists
	if (titlebarTimeout) {
		clearTimeout(titlebarTimeout);
	}

	// Hide the text after a delay
	titlebarTimeout = setTimeout(() => {
		if (elements.titlebarText) {
			elements.titlebarText.style.transition = "opacity 2s ease-out";
			elements.titlebarText.style.opacity = "0";
		}
	}, 4000);
}