import fs from "fs/promises";
import os from "os";
import path from "path";

import { app } from "electron";

import { getConfig } from "../stores/config/config.main.ts";
import { getVersion } from "../utils.ts";

const APP_NAME = "GoofCord";
const APP_CLI_NAME = "goofcord";

const AUTOSTART_DIR = path.join(os.homedir(), ".config", "autostart");
const DESKTOP_FILE_PATH = path.join(AUTOSTART_DIR, `${APP_NAME}.desktop`);

// ─── Helpers ─────────────────────────────────────────────────────

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

// Escape a file path for use in a .desktop Exec line.
// https://specifications.freedesktop.org/desktop-entry-spec/latest/exec-variables.html
//
function escapeExecPath(execPath: string): string {
	const escaped = execPath
		.replace(/\\/g, "\\\\\\\\") // \    → \\\\
		.replace(/"/g, '\\\\"') // "    → \\"
		.replace(/`/g, "\\\\`") // `    → \\`
		.replace(/\$/g, "\\\\$") // $    → \\$
		.replace(/%/g, "%%"); // %    → %%

	return `"${escaped}"`;
}

// ─── Linux ───────────────────────────────────────────────────────

function getLinuxExecCommand(): string {
	// 1. Flatpak
	if (process.env.FLATPAK_ID) {
		return `flatpak run ${process.env.FLATPAK_ID}`;
	}

	// 2. AppImage
	if (process.env.APPIMAGE) {
		return escapeExecPath(process.env.APPIMAGE);
	}

	const exePath = app.getPath("exe");

	// 3. System-wide Electron (AUR for example)
	const isSystemElectron = exePath.endsWith("/electron") || exePath.endsWith("/electron.exe");

	// 4. NixOS
	const isNixStore = exePath.startsWith("/nix/store/");

	if (isSystemElectron || isNixStore) {
		return APP_CLI_NAME;
	}

	// 5. Standard install
	return escapeExecPath(exePath);
}

async function enableLinux(): Promise<void> {
	const execCommand = getLinuxExecCommand();
	console.log("Autostart Exec:", execCommand);

	const content = ["[Desktop Entry]", "Type=Application", `Version=${getVersion()}`, `Name=${APP_NAME}`, `Comment=${APP_NAME} startup script`, `Exec=${execCommand}`, "StartupNotify=false", "Terminal=false", `Icon=${APP_CLI_NAME}`].join("\n");

	await fs.mkdir(AUTOSTART_DIR, { recursive: true });
	await fs.writeFile(DESKTOP_FILE_PATH, content, "utf-8");
}

async function disableLinux(): Promise<void> {
	if (await fileExists(DESKTOP_FILE_PATH)) {
		await fs.unlink(DESKTOP_FILE_PATH);
	}
}

// ─── macOS / Windows ─────────────────────────────────────────────

function setNativeAutostart(enabled: boolean): void {
	app.setLoginItemSettings({ openAtLogin: enabled });
}

// ─── Public API ──────────────────────────────────────────────────

export async function setAutostart<IPCHandle>(): Promise<void> {
	const enabled = getConfig("launchWithOsBoot");
	if (process.platform === "linux") {
		if (enabled) {
			await enableLinux();
		} else {
			await disableLinux();
		}
	} else {
		setNativeAutostart(enabled);
	}
}
