import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, safeStorage } from "electron";
import pc from "picocolors";
// @ts-expect-error
import gfIconIco from "../assets/gf_icon.ico";
// @ts-expect-error
import gfIconPng from "../assets/gf_icon.png";
import packageInfo from "../package.json" with { type: "json" };
import { getConfig } from "./stores/config/config.main.ts";

try {
	const portablePath = path.join(path.dirname(app.getPath("exe")), "goofcord-data");
	if (await isPathAccessible(portablePath)) {
		app.setPath("userData", portablePath);
		console.log('Found "goofcord-data" folder, running in portable mode');
	}
} catch (e) {
	console.error("Portable mode error:", e);
}

export const isWayland = process.platform === "linux" && (process.env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || !!process.env.WAYLAND_DISPLAY);
if (isWayland) console.log(pc.red("[!]") + ` You are using ${pc.greenBright("Wayland")}! >ᴗ<`);

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

export function getCustomIcon() {
	const customIconPath = getConfig("customIconPath");
	if (customIconPath !== "") return customIconPath;
	if (process.platform === "win32") return relToAbs(gfIconIco);
	return relToAbs(gfIconPng);
}

export async function readOrCreateFolder(path: string) {
	try {
		return await fs.promises.readdir(path);
	} catch (e) {
		tryCreateFolder(path);
		return [];
	}
}

export function tryCreateFolder(dirPath: string): boolean {
	try {
		fs.mkdirSync(dirPath, { recursive: true });
		return true;
	} catch (e) {
		if (e instanceof Error && (e as NodeJS.ErrnoException).code === "EEXIST") {
			console.error(`Cannot create directory '${dirPath}' because a file with that name already exists.`);
			return false;
		}

		console.error(`Failed to create directory '${dirPath}':`, e);
		return false;
	}
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
	try {
		return isEncryptionAvailable() ? safeStorage.encryptString(plaintextString).toString("base64") : plaintextString;
	} catch (e) {
		console.error(e);
		return plaintextString;
	}
}

export function decryptSafeStorage<IPCOn>(encryptedBase64: string) {
	try {
		return isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(encryptedBase64, "base64")) : encryptedBase64;
	} catch (e) {
		console.error(e);
		return encryptedBase64;
	}
}

export async function saveFileToGCFolder<IPCHandle>(filePath: string, content: string | Buffer<ArrayBuffer>) {
	const fullPath = path.join(getGoofCordFolderPath(), filePath);
	await fs.promises.writeFile(fullPath, content);
	return fullPath;
}

export async function isPathAccessible(filePath: string): Promise<boolean> {
	return fs.promises
		.access(filePath, fs.constants.F_OK)
		.then(() => true)
		.catch(() => false);
}

export function relToAbs(relative: string) {
	return path.join(dirname(), relative);
}
