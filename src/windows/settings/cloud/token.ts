import { BrowserWindow } from "electron";
import { getConfig, setConfig } from "../../../config.ts";
import { mainWindow } from "../../main/main.ts";
import { settingsWindow } from "../main.ts";
import { ENDPOINT_VERSION, LOG_PREFIX } from "./cloud.ts";

const MIN_TOKEN_LENGTH = 32;
let activeTokenPromise: Promise<string> | null = null;

export async function getCloudToken(): Promise<string> {
	let cloudToken = getConfig("cloudToken");

	if (!cloudToken || cloudToken.length < MIN_TOKEN_LENGTH) {
		console.log(LOG_PREFIX, "Token invalid or missing, fetching new one...");
		try {
			cloudToken = await getTokenFromServer();
			await setConfig("cloudToken", cloudToken);
		} catch (error) {
			console.error(LOG_PREFIX, "Failed to fetch token:", error);
			return "";
		}
	}

	return cloudToken;
}

export async function deleteToken(): Promise<void> {
	await setConfig("cloudToken", "");
	console.log(LOG_PREFIX, "Token deleted");
}

export function getCloudHost(): string {
	const link = getConfig("cloudHost");
	return link.endsWith("/") ? link : link + "/";
}

async function getTokenFromServer(): Promise<string> {
	// Prevent concurrent token fetches
	if (activeTokenPromise) {
		console.log(LOG_PREFIX, "Token fetch in progress, waiting...");
		return activeTokenPromise;
	}

	activeTokenPromise = fetchTokenInternal();

	try {
		return await activeTokenPromise;
	} finally {
		activeTokenPromise = null;
	}
}

async function fetchTokenInternal(): Promise<string> {
	const cloudHostUrl = getCloudHost();

	// 1. Fetch Client ID
	const clientIdResponse = await fetch(cloudHostUrl + ENDPOINT_VERSION + "clientid");
	if (!clientIdResponse.ok) {
		throw new Error(`Failed to fetch client ID: ${clientIdResponse.status}`);
	}

	const clientId = await clientIdResponse.text();
	if (!clientId) throw new Error("Empty client ID received");

	// 2. Determine Vencord availability and get callback URL
	let callbackUrl = "";

	const vencordAvailable = await mainWindow.webContents.executeJavaScript("window.Vencord?.Webpack !== undefined").catch(() => false);

	if (vencordAvailable) {
		mainWindow.show();
		try {
			callbackUrl = await getCallbackUrlViaVencord(clientId, cloudHostUrl);
		} catch (e) {
			console.warn(LOG_PREFIX, "Vencord method failed:", e);
		}
	}

	if (!callbackUrl) {
		callbackUrl = await getCallbackUrlViaWindow(cloudHostUrl);
	}

	if (!callbackUrl) {
		throw new Error("Failed to obtain authorization");
	}

	console.log(LOG_PREFIX, "Got callback URL");
	settingsWindow.show();

	// 3. Fetch Token using Callback URL
	const tokenResponse = await fetch(callbackUrl);
	if (!tokenResponse.ok) {
		throw new Error(`Token exchange failed: ${tokenResponse.status}`);
	}

	const json = await tokenResponse.json();
	if (json.error) throw new Error(json.error);

	return json.token || "";
}

async function getCallbackUrlViaVencord(clientId: string, cloudHostUrl: string): Promise<string> {
	const redirectUri = `${cloudHostUrl}${ENDPOINT_VERSION}callback`;

	const script = `
		new Promise((resolve, reject) => {
			try {
				const { createElement } = Vencord.Webpack.findByProps("Component", "Fragment");
				const OAuth2Modal = Vencord.Webpack.Common.OAuth2AuthorizeModal;
				
				if (!OAuth2Modal || !Vencord.Util.openModal) {
					return reject(new Error("Required components not found"));
				}
				
				let resolved = false;
				
				Vencord.Util.openModal((props) => {
					const originalClose = props.onClose;
					props.onClose = () => {
						if (!resolved) reject(new Error("Modal closed"));
						originalClose?.();
					};
					
					return createElement(OAuth2Modal, {
						...props,
						scopes: ["identify"],
						responseType: "code",
						redirectUri: "${redirectUri}",
						permissions: 0n,
						clientId: "${clientId}",
						cancelCompletesFlow: false,
						callback: (result) => {
							resolved = true;
							result?.location ? resolve(result.location) : 
								reject(new Error("No location received"));
						}
					});
				});
			} catch (e) {
				reject(e);
			}
		});
	`;

	return mainWindow.webContents.executeJavaScript(script);
}

async function getCallbackUrlViaWindow(cloudHostUrl: string): Promise<string> {
	return new Promise((resolve, reject) => {
		let authWindow: BrowserWindow | null = null;
		let settled = false;

		const cleanup = () => {
			if (settled) return;
			settled = true;

			if (authWindow && !authWindow.isDestroyed()) {
				authWindow.destroy();
			}
			authWindow = null;
		};

		try {
			authWindow = new BrowserWindow({
				width: 660,
				height: 700,
				title: "Cloud Authentication",
				autoHideMenuBar: true,
				parent: settingsWindow,
				modal: true,
			});

			const callbackPrefix = `${cloudHostUrl}${ENDPOINT_VERSION}callback`;

			authWindow.on("closed", () => {
				if (!settled) {
					settled = true;
					reject(new Error("Authentication window closed"));
				}
			});

			// Intercept callback
			authWindow.webContents.session.webRequest.onBeforeRequest({ urls: [`${callbackPrefix}?*`] }, (details, callback) => {
				if (details.url.includes("?code=")) {
					console.log(LOG_PREFIX, "Got callback");
					resolve(details.url);
					cleanup();
					callback({ cancel: true });
				} else {
					callback({ cancel: false });
				}
			});

			authWindow.loadURL(cloudHostUrl + ENDPOINT_VERSION + "login");
			authWindow.show();
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
}
