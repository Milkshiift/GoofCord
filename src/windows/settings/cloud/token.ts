import { getConfig, setConfig } from "../../../config.ts";
import { mainWindow } from "../../main/main.ts";
import { settingsWindow } from "../main.ts";
import { ENDPOINT_VERSION, LOG_PREFIX, showDialogAndLog } from "./cloud.ts";

export async function getCloudToken() {
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
	try {
		if (!getConfig("modNames").includes("shelter") || !getConfig("installDefaultShelterPlugins")) {
			await showDialogAndLog("error", "Failed to get token", "You need to enable shelter and install the default plugins to use cloud storage");
			return "";
		}

		serverListening = true;

		mainWindow.show();

		const clientIdFetch = await fetch(getCloudHost() + ENDPOINT_VERSION + "clientid");
		if (!clientIdFetch.ok) {
			throw new Error(`Failed to fetch client ID: ${clientIdFetch.status} ${clientIdFetch.statusText}`);
		}
		const clientId = await clientIdFetch.text();

		const callbackUrl = await mainWindow.webContents.executeJavaScript(`
			(async () => {
				const openModal = webpackMagic.findByCode("{modalKey:", ",instant:", ".setState(");
				const { OAuth2AuthorizeModal } = webpackMagic.findByProps("OAuth2AuthorizeModal");
				const { createElement } = webpackMagic.findByProps("Component", "Fragment", "Profiler");
				let callbackUrl = "unset";

				openModal((props) => createElement(OAuth2AuthorizeModal, {
					...props,
					scopes: ["identify"],
					responseType: "code",
					redirectUri: "${getCloudHost()+ENDPOINT_VERSION}callback",
					permissions: 0n,
					clientId: "${clientId}",
					cancelCompletesFlow: false,
					callback: ({ location }) => {callbackUrl = location}
				}));
				while (callbackUrl == "unset") {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
				return callbackUrl;
			})();
		`);
		if (!callbackUrl) throw new Error("Failed to get callback URL");

		console.log(LOG_PREFIX, "Callback URL:", callbackUrl);
		settingsWindow.show();

		const response = await fetch(callbackUrl);
		if (!response.ok) throw new Error(`Callback request failed: ${response.status} ${response.statusText}`);
		const json = await response.json();
		if (json.error) throw new Error(json.error);

		serverListening = false;
		return json.token ?? "";
	} catch (error) {
		serverListening = false;
		throw error;
	}
}

export function getCloudHost() {
	const link = getConfig("cloudHost");
	return link.endsWith("/") ? link : link + "/";
}