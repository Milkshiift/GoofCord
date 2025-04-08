import { getConfig } from "../config.ts";
import { getGoofCordFolderPath } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let initialised = false;

export async function initArrpc<IPCHandle>() {
	if (!getConfig("arrpc") || initialised) return;
	try {
		const { default: Server } = await import("arrpc");
		const Bridge = await import("arrpc/src/bridge.js");
		const server = new Server(getGoofCordFolderPath() + "/detectable.json");
		server.on("activity", (data: object) => Bridge.send(data));
		server.on("invite", (code: string) => {
			mainWindow.show();
			Bridge.send({
				cmd: "INVITE_BROWSER",
				args: {
					"code": code
				}
			})
		});

		initialised = true;
	} catch (e) {
		console.error("Failed to start arRPC server", e);
	}
}
