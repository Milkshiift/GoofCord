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
		console.log(LOG_PREFIX, "Current cloud token is invalid or missing. Attempting to fetch a new one.");
		try {
			const newCloudToken = await getTokenFromServer();
			await setConfig("cloudToken", newCloudToken);
			cloudToken = newCloudToken;

			if (!newCloudToken) {
				console.warn(LOG_PREFIX, "Fetched an empty token");
			}
		} catch (error) {
			console.error(LOG_PREFIX, "Error fetching a new cloud token: ", error);
		}
	}

	console.log(LOG_PREFIX, "Cloud token:", cloudToken);
	return cloudToken;
}

export async function deleteToken(): Promise<void> {
	await setConfig("cloudToken", "");
	console.log(LOG_PREFIX, "Cloud token deleted.");
}

async function getTokenFromServer(): Promise<string> {
	if (activeTokenPromise) {
		console.log(LOG_PREFIX, "Token fetch already in progress, awaiting existing request.");
		return activeTokenPromise;
	}

	activeTokenPromise = (async (): Promise<string> => {
		console.log(LOG_PREFIX, "Fetching new token...");
		try {
			const cloudHostUrl = getCloudHost();

			// 1. Fetch Client ID
			const clientIdResponse = await fetch(cloudHostUrl + ENDPOINT_VERSION + "clientid");
			if (!clientIdResponse.ok) throw new Error(`Failed to fetch client ID: ${clientIdResponse.status} ${clientIdResponse.statusText}`);

			const clientId = await clientIdResponse.text();
			if (!clientId) throw new Error("Received an empty client ID from the server.");

			// 2. Determine Vencord availability and get callback URL
			const vencordAvailable = await mainWindow.webContents.executeJavaScript("window.Vencord && window.Vencord.Webpack !== undefined").catch(() => false);

			let callbackUrl = "";
			if (vencordAvailable) {
				mainWindow.show();
				try {
					callbackUrl = await getCallbackUrlViaVencordModal(clientId, cloudHostUrl);
				} catch (e) {
					console.warn(LOG_PREFIX, "Vencord modal failed, attempting fallback:", e);
				}
			}

			if (!callbackUrl) {
				callbackUrl = await getCallbackUrlViaFallbackWindow(cloudHostUrl);
			}

			if (!callbackUrl) {
				throw new Error("Failed to obtain callback URL through any method.");
			}

			console.log(LOG_PREFIX, "Using callback URL:", callbackUrl);
			settingsWindow.show();

			// 3. Fetch Token using Callback URL
			const tokenResponse = await fetch(callbackUrl);
			if (!tokenResponse.ok) throw new Error(`Callback request failed: ${tokenResponse.status} ${tokenResponse.statusText}`);

			const json = await tokenResponse.json();
			if (json.error) throw new Error(`Server returned an error during token exchange: ${json.error}`);

			return json.token ?? "";
		} catch (error) {
			console.error(LOG_PREFIX, "Error during token acquisition from server:", error);
			throw error;
		}
	})();

	try {
		return await activeTokenPromise;
	} finally {
		activeTokenPromise = null;
	}
}

async function getCallbackUrlViaVencordModal(clientId: string, cloudHostUrl: string): Promise<string> {
	const redirectUri = `${cloudHostUrl}${ENDPOINT_VERSION}callback`;
	const script = `
        new Promise((resolve, reject) => {
            try {
                if (!window.Vencord || !window.Vencord.Webpack || !window.Vencord.Util) {
                    return reject(new Error("Vencord API not fully available."));
                }
                const { createElement } = Vencord.Webpack.findByProps("Component", "Fragment", "Profiler");
                const OAuth2Modal = Vencord.Webpack.Common.OAuth2AuthorizeModal;

                if (!createElement || !OAuth2Modal || !Vencord.Util.openModal) {
                     return reject(new Error("Required Vencord components for OAuth modal not found."));
                }

                let settled = false;

                const handleResolve = (location) => {
                    if (settled) return;
                    settled = true;
                    resolve(location);
                };

                const handleReject = (errorMessage) => {
                    if (settled) return;
                    settled = true;
                    reject(new Error(errorMessage));
                };

                Vencord.Util.openModal((modalProps) => {
                    const originalOnClose = modalProps.onClose;
                    modalProps.onClose = () => {
                        if (!settled) {
                            console.warn("Cloud OAuth modal closed by user before completion.");
                            handleReject("OAuth modal was closed by user before completion.");
                        }
                        if (originalOnClose) originalOnClose();
                    };

                    return createElement(OAuth2Modal, {
                        ...modalProps,
                        scopes: ["identify"],
                        responseType: "code",
                        redirectUri: "${redirectUri}",
                        permissions: 0n,
                        clientId: "${clientId}",
                        cancelCompletesFlow: false,
                        callback: (result) => {
                            if (result && result.location) {
                                handleResolve(result.location);
                            } else {
                                handleReject(result && result.error ? result.error : "OAuth flow failed or was cancelled by server/modal. No location returned.");
                            }
                        }
                    });
                });
            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        });
    `;
	return mainWindow.webContents.executeJavaScript(script);
}

async function getCallbackUrlViaFallbackWindow(cloudHostUrl: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const authWindow = new BrowserWindow({
			width: 660,
			height: 700,
			title: "Cloud Authentication",
			autoHideMenuBar: true,
			parent: settingsWindow,
			modal: true,
		});

		let settled = false;
		const fullCallbackPrefix = `${cloudHostUrl}${ENDPOINT_VERSION}callback`;
		const urlFilter = { urls: [`${fullCallbackPrefix}?*`] };

		const cleanup = () => {
			if (settled) return;

			if (authWindow && !authWindow.isDestroyed() && authWindow.webContents && authWindow.webContents.session) {
				try {
					authWindow.webContents.session.webRequest.onBeforeSendHeaders(urlFilter, null);
				} catch (e) {
					console.warn(LOG_PREFIX, "Error removing webRequest listener:", e);
				}
			}

			if (authWindow && !authWindow.isDestroyed()) {
				authWindow.close();
			}
		};

		authWindow.on("closed", () => {
			if (!settled) {
				console.log(LOG_PREFIX, "Authentication window was closed before completion.");
				reject(new Error("Cloud authentication window was closed before completion."));
				settled = true;
			}
		});

		authWindow.webContents.session.webRequest.onBeforeSendHeaders(urlFilter, (details, callback) => {
			if (details.resourceType === "mainFrame" && details.url.startsWith(fullCallbackPrefix) && details.url.includes("?code=")) {
				console.log(LOG_PREFIX, "Intercepted callback URL in fallback window:", details.url);
				if (!settled) {
					resolve(details.url);
					cleanup();
				}
				callback({ cancel: true });
				return;
			}
			callback({ cancel: false });
		});

		authWindow.loadURL(cloudHostUrl + ENDPOINT_VERSION + "login")
			.then(() => {
				authWindow.show();
				authWindow.focus();
			})
			.catch((error) => {
				console.error(LOG_PREFIX, "Failed to load authentication URL in fallback window:", error);
				if (!settled) {
					reject(error);
					cleanup();
				}
			});
	});
}

export function getCloudHost(): string {
	const link = getConfig("cloudHost");
	return link.endsWith("/") ? link : link + "/";
}