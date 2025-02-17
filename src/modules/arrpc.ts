import { getConfig } from "../config.ts";
import { getGoofCordFolderPath } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

export async function initArrpc() {
	if (!getConfig("arrpc")) return;
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

		// server.on("invite", async (code: string) => {
		// 	const inviteRequest = await fetch("https://discordapp.com/api/v9/invites/" + code);
		// 	const inviteData = await inviteRequest.json();
		// 	const response = await dialog.showMessageBox({
		// 		message: i("inviteMessage")+" "+inviteData.guild.name+"?",
		// 		buttons: [i("yes"), i("no")],
		// 	});
		// 	if (response.response === 0) {
		// 		void mainWindow.webContents.executeJavaScript(`
		// 			shelter.http.post({
		// 				url: "/invites/${code}"
		// 			})
		// 		`);
		// 		mainWindow.show();
		// 	}
		// });
	} catch (e) {
		console.error("Failed to start arRPC server", e);
	}
}
