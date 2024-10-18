import { getConfig, setConfig } from "../../../config.ts";
import { mainWindow } from "../../main/main.ts";
import { settingsWindow } from "../main.ts";
import { ENDPOINT_VERSION, LOG_PREFIX, showDialogAndLog } from "./cloud.ts";

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
async function getTokenFromServer() {
	if (!getConfig("modNames").includes("shelter") || !getConfig("installDefaultShelterPlugins")) {
		await showDialogAndLog("error", "Failed to get token", "You need to enable shelter and install the default plugins to use cloud storage");
		return "";
	}
	serverListening = true;

	mainWindow.show();
	const callbackUrl = await mainWindow.webContents.executeJavaScript(`
		(async () => {
			let modalAPI = webpackMagic.findByProps("openModalLazy");
			let { OAuth2AuthorizeModal } = webpackMagic.findByProps("OAuth2AuthorizeModal");
			let { jsx } = webpackMagic.findByProps("jsx");
			let callbackUrl;
			modalAPI.openModal((props) => 
    			jsx(OAuth2AuthorizeModal, {
    			    ...props,
    			    scopes: ["identify"],
    			    responseType: "code",
    			    redirectUri: "${getCloudHost()}${ENDPOINT_VERSION}callback",
    			    permissions: 0n,
    			    clientId: "${await (await fetch(getCloudHost() + ENDPOINT_VERSION + "clientid")).text()}",
    			    cancelCompletesFlow: false,
    			    callback: ({ location }) => {callbackUrl = location}
    			})
    		);
    		while (!callbackUrl) await new Promise((resolve) => setTimeout(resolve, 100));
			return callbackUrl;
		})();
	`);
	console.log(LOG_PREFIX, "Callback URL:", callbackUrl);
	settingsWindow.show();

	const response = await fetch(callbackUrl);
	const json = await response.json();

	serverListening = false;
	return json.token;
}

export function getCloudHost() {
	const link = getConfig("cloudHost");
	return link.endsWith("/") ? link : link + "/";
}
