import { whenConfigReady } from "@root/src/stores/config/config.preload.ts";
import { whenLocalizationReady } from "@root/src/stores/localization/localization.preload.ts";
import { render } from "preact";

import { App } from "./App.tsx";

console.log("GoofCord Settings");

async function init(): Promise<void> {
	if (document.readyState === "loading") {
		await new Promise<void>((resolve) => {
			document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
		});
	}

	// Initialize config and localization stores concurrently
	await Promise.all([whenConfigReady(), whenLocalizationReady()]);

	const root = document.createElement("div");
	root.id = "app-root";
	document.body.appendChild(root);

	render(<App />, root);
}

init().catch(console.error);
