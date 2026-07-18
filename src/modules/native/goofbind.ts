import { isWayland } from "@root/src/utils.ts";
import pc from "picocolors";
import {Goofbind, type Keybind} from "goofbind";

import { mainWindow } from "../../windows/main/main.ts";
import {app} from "electron";
import path from "node:path";

let goofbind: Goofbind | undefined;

export async function initGoofbind() {
	if (goofbind || process.argv.includes("--no-goofbind")) return;

	try {
		goofbind = new Goofbind(
			app.isPackaged ? path.join(process.resourcesPath, "goofbind")
			: path.join(app.getAppPath(), "..", "node_modules", "goofbind", "dist", `goofbind-${process.platform}-${process.arch}`),
			"io.github.milkshiift.GoofCord"
		);
		console.log(pc.green("[Goofbind]"), "Loaded goofbind");

		goofbind.on('error', (err) => console.error('Goofbind', err));

		goofbind.on('pressed', (id) => {
			if (!isWayland && mainWindow.isFocused()) return;
			console.log(`Shortcut Activated! ID: ${id}`);
			mainWindow.webContents.send("keybinds:trigger", id, false);
		});

		goofbind.on('released', (id) => {
			if (!isWayland && mainWindow.isFocused()) return;
			console.log(`Shortcut Released! ID: ${id}`);
			mainWindow.webContents.send("keybinds:trigger", id, true);
		});
	} catch (e: unknown) {
		console.error("Failed to import/init goofbind", e);
	}
}

export async function setKeybinds<IPCHandle>(keybinds: Keybind[]) {
	await initGoofbind();
	console.log(pc.green("[Goofbind]"), "Setting keybinds:", keybinds);
	goofbind?.setKeybinds(keybinds);
}
