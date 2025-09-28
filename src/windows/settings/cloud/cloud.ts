import { dialog } from "electron";
import pc from "picocolors";
import { cachedConfig, getConfig, setConfigBulk } from "../../../config.ts";
import type { ConfigKey, ConfigValue } from "../../../configTypes";
import { encryptionPasswords } from "../../../modules/messageEncryption.ts";
import { decryptSafeStorage } from "../../../utils.ts";
import { decryptString, encryptString } from "./encryption.ts";
import { deleteToken, getCloudHost, getCloudToken } from "./token.ts";

export const LOG_PREFIX = pc.cyanBright("[Cloud]");
export const ENDPOINT_VERSION = "v1/"; // A slash should be at the end

let currentOperation: string | null = null;

async function withLock<T>(operation: string, fn: () => Promise<T>): Promise<T | void> {
    if (currentOperation) {
        const message = `"${currentOperation}" operation is already running. Please wait for it to complete.`;
        console.log(LOG_PREFIX, message);
        await showDialog("info", "Operation in Progress", message);
        return; // Abort
    }

    try {
        currentOperation = operation;
        return await fn();
    } finally {
        currentOperation = null;
    }
}

function getEncryptionKey(): string {
    try {
        return decryptSafeStorage(getConfig("cloudEncryptionKey"));
    } catch {
        return "";
    }
}

export async function loadCloud<IPCHandle>(): Promise<void> {
    return withLock("load", async () => {
        const response = await callEndpoint("load", "GET");
        if (!response?.settings || response.settings.length < 50) {
            await showDialog("info", "Cloud Settings", "Nothing to load");
            return;
        }

        const cloudSettings = await decryptString(response.settings, getEncryptionKey());
        if (!cloudSettings || typeof cloudSettings !== "object") {
            await showDialog("error", "Invalid Settings", "Failed to load cloud settings");
            return;
        }

        console.log(LOG_PREFIX, "Loading settings from cloud");

        const configToSet = new Map(cachedConfig);
        for (const [key, value] of Object.entries(cloudSettings)) {
            configToSet.set(key as ConfigKey, value as ConfigValue<ConfigKey>);
        }

        await setConfigBulk(configToSet);
        await showDialog("info", "Settings loaded",
            "Settings loaded from cloud successfully. Please restart GoofCord to apply the changes.");
    });
}

export async function saveCloud<IPCHandle>(silent = false): Promise<void> {
    return withLock("save", async () => {
        const excludedOptions = ["cloudEncryptionKey", "cloudHost", "cloudToken", "modEtagCache"];
        const configToSave = new Map(cachedConfig);

        if (getEncryptionKey()) {
            configToSave.set("encryptionPasswords", encryptionPasswords);
        } else {
            excludedOptions.push("encryptionPasswords");
        }

        const settings = Object.fromEntries(
            [...configToSave].filter(([key]) => !excludedOptions.includes(key)), // Removing excluded options
        );

        const encryptedSettings = await encryptString(JSON.stringify(settings), getEncryptionKey());
        if (!encryptedSettings) return;

        const response = await callEndpoint("save", "POST",
            JSON.stringify({ settings: encryptedSettings }));

        if (response && !silent) {
            await showDialog("info", "Settings saved", "Settings saved successfully on cloud.");
        }
    });
}

export async function deleteCloud<IPCHandle>(): Promise<void> {
    return withLock("delete", async () => {
        const response = await callEndpoint("delete", "GET");
        if (!response) return;

        await deleteToken();
        await showDialog("info", "Settings deleted", "Settings deleted from cloud successfully.");
    });
}

async function callEndpoint(endpoint: string, method: string, body?: string): Promise<object> {
    try {
        console.log(LOG_PREFIX, `Calling endpoint: ${endpoint}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(getCloudHost() + ENDPOINT_VERSION + endpoint, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: await getCloudToken(),
            },
            body,
            signal: controller.signal
        });
        clearTimeout(timeout);

        const responseText = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
        }

        const responseJson = responseText ? JSON.parse(responseText) : {};
        if (responseJson.error) throw new Error(responseJson.error);

        return responseJson;
    } catch (error: unknown) {
        const lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors, we need to acquire a valid token first.
        if (lastError.message.includes("Unauthorized") || lastError.message.includes("401")) {
            await deleteToken();
        }

        await showDialog("error", "Cloud error", `Error when calling "${endpoint}": ${lastError.message}`);
        throw lastError;
    }
}

async function showDialog(type: "info" | "error", title: string, message: string): Promise<void> {
    type === "info" ? console.log(LOG_PREFIX, message) : console.error(LOG_PREFIX, message);
    await dialog.showMessageBox({
        type,
        title,
        message,
        buttons: ["OK"],
    });
}