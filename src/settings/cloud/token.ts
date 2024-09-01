import { shell } from "electron";
import { createServer } from "node:http";
import { getConfig, setConfig } from "../../config";
import { LOG_PREFIX } from "./cloud";

export async function getCloudToken(): Promise<string> {
	let cloudToken = getConfig("cloudToken");

	if (!serverListening && (!cloudToken || cloudToken.length < 32)) {
		cloudToken = await getTokenFromServer();
		await setConfig("cloudToken", cloudToken);
	}

	console.log(LOG_PREFIX, "Cloud token:", cloudToken);
	return cloudToken;
}

export async function deleteToken() {
	await setConfig("cloudToken", "");
}

let serverListening = false;
async function getTokenFromServer(): Promise<string> {
	serverListening = true;
	await shell.openExternal(`${getCloudHost()}login`);
	return new Promise<string>((resolve) => {
		const server = createServer((req, res) => {
			const token = req.url?.split("/")[1];
			if (token) {
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("Token received, you can close this tab now.");
				server.close();
				serverListening = false;
				resolve(token);
			}
		});

		server.listen(9998, "127.0.0.1", () => {
			console.log("Listening on", server.address());
		});
	});
}

export function getCloudHost() {
	const link = getConfig("cloudHost");
	return link.endsWith("/") ? link : link + "/";
}
