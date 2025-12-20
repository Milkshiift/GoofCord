let flashbar: HTMLElement | null = null;
let flashbarText: HTMLElement | null = null;
let colorTimer: NodeJS.Timeout;
let textTimer: NodeJS.Timeout;

const styles = `
	#flashbar-text {
		position: fixed;
		width: 100%;
		height: var(--custom-app-top-bar-height);
		
		display: flex;
		justify-content: center;
		align-items: center;
		
		font-family: var(--font-code);
		font-size: 15px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		
		background: radial-gradient(ellipse at top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 60%);
		
		z-index: 10000;
		opacity: 0;
		pointer-events: none;
		will-change: opacity;
		transition: opacity 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
		
		white-space: nowrap;
		box-sizing: border-box;
	}

	#flashbar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: var(--custom-app-top-bar-height);
		z-index: 998;
		pointer-events: none;
		transition: background-color 0.3s ease-out;
	}
`;

export async function injectFlashbar(): Promise<void> {
	if (flashbar) return;

	document.addEventListener(
		"DOMContentLoaded",
		() => {
			const styleSheet = document.createElement("style");
			styleSheet.textContent = styles;
			document.head.appendChild(styleSheet);

			flashbar = document.createElement("div");
			flashbar.id = "dragbar";

			flashbarText = document.createElement("div");
			flashbarText.id = "titlebar-text";

			document.body.prepend(flashbarText);
			document.body.prepend(flashbar);
		},
		{ once: true },
	);
}

export function flashTitlebar(color: string): void {
	if (!flashbar) return;

	clearTimeout(colorTimer);

	flashbar.style.backgroundColor = color;

	colorTimer = setTimeout(() => {
		if (flashbar) flashbar.style.backgroundColor = "";
	}, 400);
}

export function flashTitlebarWithText(color: string, text: string): void {
	flashTitlebar(color);

	if (!flashbarText) return;

	clearTimeout(textTimer);

	flashbarText.textContent = text;
	flashbarText.style.opacity = "1";

	textTimer = setTimeout(() => {
		if (flashbarText) flashbarText.style.opacity = "0";
	}, 4000);
}
