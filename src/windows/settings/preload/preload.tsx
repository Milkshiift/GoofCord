import { whenConfigReady } from "@root/src/stores/config/config.preload.ts";
import { whenLocalizationReady } from "@root/src/stores/localization/localization.preload.ts";
import { render } from "preact";
import { App } from "./App.tsx";

console.log("GoofCord Settings");

async function init() {
	if (document.readyState === "loading") {
		await new Promise<void>((r) => document.addEventListener("DOMContentLoaded", r as unknown as EventListener));
	}

	await whenConfigReady();
	await whenLocalizationReady();

	const root = document.createElement("div");
	root.id = "app-root";
	document.body.appendChild(root);

	render(<App />, root);
}

init().catch(console.error);
