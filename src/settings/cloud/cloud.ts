import { cachedConfig, getConfig, setConfigBulk } from "../../config";
import { dialog } from "electron";
import chalk from "chalk";
import { deleteToken, getCloudHost, getCloudToken } from "./token";
import { decryptString, encryptString } from "./encryption";

const LOG_PREFIX = chalk.cyanBright("[Cloud Settings]");

function getEncryptionKey(): string {
	return getConfig("cloudEncryptionKey");
}

export async function loadCloud() {
	const response = await callEndpoint("load", "GET");
	if (!response?.settings || response.settings.length < 50) {
		await showDialogAndLog("info", "Cloud Settings", "Nothing to load");
		return;
	}

	const decryptedSettings = await decryptString(response.settings, getEncryptionKey());
	if (!decryptedSettings) return;
	const cloudSettings = JSON.parse(decryptedSettings);

	console.log(LOG_PREFIX, "Loading cloud settings:", cloudSettings);
	await setConfigBulk(cloudSettings);
	await showDialogAndLog("info", "Settings loaded", "Settings loaded from cloud successfully. Please restart GoofCord to apply the changes.");
}

export async function saveCloud() {
	const encryptedSettings = await encryptString(JSON.stringify(cachedConfig), getEncryptionKey());
	if (!encryptedSettings) return;
	const response = await callEndpoint("save", "POST", JSON.stringify({ settings: encryptedSettings }));
	if (!response) return;
	await showDialogAndLog("info", "Settings saved", "Settings saved successfully on cloud.");
}

export async function deleteCloud() {
	const response = await callEndpoint("delete", "GET");
	if (!response) return;
	await deleteToken();
	await showDialogAndLog("info", "Settings deleted", "Settings deleted from cloud successfully.");
}

async function callEndpoint(endpoint: string, method: string, body?: string) {
	try {
		console.log(LOG_PREFIX, "Calling endpoint:", endpoint);
		const response = await fetch(getCloudHost() + endpoint, {
			method,
			headers: {
				"Content-Type": "application/json",
				Authorization: await getCloudToken(),
			},
			body,
		});

		const responseJson = await response.json();
		if (responseJson.error) throw new Error(responseJson.error);
		return responseJson;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		await showDialogAndLog("error", "Cloud error", `Error when calling "${endpoint}" endpoint: ${errorMessage}`);
		return undefined;
	}
}

export async function showDialogAndLog(type: "info" | "error", title: string, message: string) {
	type === "info" ? console.log(LOG_PREFIX, message) : console.error(LOG_PREFIX, message);
	await dialog.showMessageBox({
		type,
		title,
		message,
		buttons: ["OK"],
	});
}
