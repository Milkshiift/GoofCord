import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, safeStorage } from "electron";
import packageInfo from "../package.json" assert { type: "json" };
import { getConfig } from "./config.ts";

export const dirname = () => path.dirname(fileURLToPath(import.meta.url));
export const packageVersion = packageInfo.version;
export const userDataPath = app.getPath("userData");

export function getVersion<IPCOn>() {
	return packageVersion;
}

export function isDev() {
	return process.argv.some((arg) => arg === "--dev" || arg === "-d");
}

export function getGoofCordFolderPath() {
	return path.join(userDataPath, "/GoofCord/");
}

export function getDisplayVersion<IPCOn>() {
	if (!(app.getVersion() === packageVersion)) {
		if (app.getVersion() === process.versions.electron) {
			return `Dev Build (${packageVersion})`;
		}
		return `${packageVersion} [Modified]`;
	}
	return packageVersion;
}

export function getAsset<IPCOn>(assetName: string) {
	return path.join(dirname(), "/assets/", assetName);
}

export function getCustomIcon() {
	const customIconPath = getConfig("customIconPath");
	if (customIconPath !== "") return customIconPath;
	if (process.platform === "win32") return getAsset("gf_icon.ico");
	return getAsset("gf_icon.png");
}

export async function getTrayIcon() {
	if (getConfig("trayIcon") === "default") return getCustomIcon();
	return getAsset(getConfig("trayIcon"));
}

export async function readOrCreateFolder(path: string) {
	try {
		return await fs.promises.readdir(path);
	} catch (e) {
		tryCreateFolder(path);
		return [];
	}
}

export function tryCreateFolder(path: string) {
	try {
		// Synchronous mkdir is literally 100 times faster than the promisified version
		fs.mkdirSync(path, { recursive: true });
	} catch (e: unknown) {
		if (e instanceof Error && "code" in e && e.code !== "EEXIST") {
			console.error(e);
			return "EEXIST";
		}
	}
	return "OK";
}

type ErrorWithMessage = {
	message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
	return typeof error === "object" && error !== null && "message" in error && typeof (error as Record<string, unknown>).message === "string";
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
	if (isErrorWithMessage(maybeError)) {
		return maybeError;
	}

	try {
		return new Error(JSON.stringify(maybeError));
	} catch {
		// fallback in case there's an error stringifying the maybeError
		//  with circular references for example.
		return new Error(String(maybeError));
	}
}

export function getErrorMessage(error: unknown): string {
	return toErrorWithMessage(error).message;
}

export function isEncryptionAvailable<IPCOn>() {
	return safeStorage.isEncryptionAvailable();
}

export function encryptSafeStorage<IPCOn>(plaintextString: string) {
	return isEncryptionAvailable() ? safeStorage.encryptString(plaintextString).toString("base64") : plaintextString;
}

export function decryptSafeStorage<IPCOn>(encryptedBase64: string) {
	return isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(encryptedBase64, "base64")) : encryptedBase64;
}

export async function saveFileToGCFolder<IPCHandle>(filePath: string, content: string) {
	const fullPath = path.join(getGoofCordFolderPath(), filePath);
	await fs.promises.writeFile(fullPath, content);
	return fullPath;
}

export async function isFileAccessible(filePath: string) {
	try {
		await fs.promises.access(filePath, fs.constants.F_OK);
		return true;
	} catch (error) {
		return false;
	}
}