import { getConfig } from "../config.ts";
import { mainWindow } from "../windows/main/main.ts";

export async function initArrpc() {
	if (!getConfig("arrpc")) return;
	try {
		const { default: Server } = await import("arrpc");
		const Bridge = await import("arrpc/src/bridge.js");
		const server = new Server();
		server.on("activity", (data: object) => Bridge.send(data));
		server.on("invite", (code: string) => {
			mainWindow.webContents.executeJavaScript(`
				shelter.http.post({
  					url: "/invites/${code}"
				})
			`);
			mainWindow.show();
		});
	} catch (e) {
		console.error("Failed to start arRPC server", e);
	}
}
