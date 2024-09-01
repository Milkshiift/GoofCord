import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { app, dialog, ipcRenderer } from "electron";
import { getConfig } from "./config";

export const packageVersion = require("../package.json").version;
export const userDataPath = process.type === "browser" ? app.getPath("userData") : ipcRenderer.sendSync("getUserDataPath");

export function addStyle(styleString: string) {
	const style = document.createElement("style");
	style.textContent = styleString;
	document.head.append(style);
}

export function addScript(scriptString: string) {
	const script = document.createElement("script");
	script.textContent = scriptString;
	document.body.append(script);
}

export function getVersion() {
	return packageVersion;
}

export function isDev() {
	return process.argv.some((arg) => arg === "--dev" || arg === "-d");
}

export function getGoofCordFolderPath() {
	return path.join(userDataPath, "/GoofCord/");
}

export function getDisplayVersion() {
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
	if (process.platform === "win32") return path.join(__dirname, "/assets/gf_icon.ico");
	return path.join(__dirname, "/assets/gf_icon.png");
}

export function isSemverLower(version1: string, version2: string): boolean {
	const v1Parts = version1.split(".").map(Number);
	const v2Parts = version2.split(".").map(Number);

	for (let i = 0; i < v1Parts.length; i++) {
		const v1Part = v1Parts[i];
		const v2Part = v2Parts[i];

		if (v1Part < v2Part) {
			return true;
		}
		if (v1Part > v2Part) {
			return false;
		}
	}

	return false;
}

export async function tryWithFix<T>(toDo: () => T | Promise<T>, attemptFix: () => void | Promise<void>, message: string) {
	try {
		return await toDo();
	} catch (error) {
		console.error(chalk.bgRed("[Auto Fixer]"), message, error);
		await attemptFix();
		try {
			return await toDo();
		} catch (error) {
			console.error(chalk.bgRedBright("[Auto Fixer FAIL]"), message, error);
			dialog.showErrorBox("Auto fixer tried to fix an issue, but failed", `${message}\n\n${getErrorMessage(error)}`);
		}
	}
}

export async function readOrCreateFolder(path: string) {
	try {
		return await fs.readdir(path);
	} catch (e) {
		await tryCreateFolder(path);
		return [];
	}
}

export async function tryCreateFolder(path: string) {
	try {
		await fs.mkdir(path, { recursive: true });
	} catch (e: unknown) {
		if (e instanceof Error && "code" in e && e.code !== "EEXIST") {
			console.error(e);
		}
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

export function findKeyAtDepth(obj: object, targetKey: string, depth: number) {
	if (depth === 1) {
		return obj[targetKey] || undefined;
	}

	for (const key in obj) {
		if (typeof obj[key] === "object" && obj[key] !== null) {
			const result = findKeyAtDepth(obj[key], targetKey, depth - 1);
			if (result !== undefined) {
				return result;
			}
		}
	}

	return undefined;
}
