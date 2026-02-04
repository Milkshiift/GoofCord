// Spoofs the Chrome browser

import { release } from "node:os";
import type { BrowserWindow } from "electron";
import pc from "picocolors";
import { getConfig } from "../stores/config/config.main.ts";

// Fun
const logPrefix = pc.red("[Chr") + pc.yellow("ome ") + pc.green("Spoo") + pc.blue("fer]");

interface Brand {
	brand: string;
	version: string;
}

// https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#type-UserAgentMetadata
interface UserAgentMetadata {
	brands: Brand[];
	fullVersionList: Brand[];
	platform: string;
	platformVersion: string;
	architecture: string;
	model: string;
	mobile: boolean;
	bitness: string;
	wow64: boolean;
}

interface Profile {
	userAgent: string;
	platform: string; // navigator.platform
	metadata: UserAgentMetadata; // navigator.userAgentData (Client Hints)
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/User-agent_reduction
function generateUserAgentString(platform: "win32" | "darwin" | "linux", majorVersion: string): string {
	const engine = "AppleWebKit/537.36 (KHTML, like Gecko)";
	const browser = `Chrome/${majorVersion}.0.0.0 Safari/537.36`;

	switch (platform) {
		case "win32":
			return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${engine} ${browser}`;
		case "darwin":
			return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${engine} ${browser}`;
		case "linux":
			return `Mozilla/5.0 (X11; Linux x86_64) ${engine} ${browser}`;
		default:
			return `Mozilla/5.0 (X11; ${platform} x86_64) ${engine} ${browser}`;
	}
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Client_hints
function generateClientHints(platform: "win32" | "darwin" | "linux", arch: string, osVersion: string, chromeVersion: string): UserAgentMetadata {
	const majorVersion = chromeVersion.split(".")[0];

	const brands: Brand[] = [
		{ brand: "Chromium", version: majorVersion },
		{ brand: "Google Chrome", version: majorVersion },
		{ brand: "Not_A Brand", version: "99" },
	];

	const fullVersionList: Brand[] = [
		{ brand: "Chromium", version: chromeVersion },
		{ brand: "Google Chrome", version: chromeVersion },
		{ brand: "Not_A Brand", version: "99.0.0.0" },
	];

	let pPlatform = "Unknown";
	let pVersion = osVersion;
	let pArch = "x86";
	let pBitness = "64";

	if (platform === "win32") {
		pPlatform = "Windows";
		pVersion = "10.0.0";
		pArch = "x86";
		pBitness = "64";
	} else if (platform === "darwin") {
		pPlatform = "macOS";
		pArch = arch === "arm64" ? "arm" : "x86";
		pBitness = "64";
	} else if (platform === "linux") {
		pPlatform = "Linux";
		pVersion = "";
		pArch = "x86";
		pBitness = "64";
	}

	return {
		brands,
		fullVersionList,
		platform: pPlatform,
		platformVersion: pVersion,
		architecture: pArch,
		model: "",
		mobile: false,
		bitness: pBitness,
		wow64: false,
	};
}

function getProfile(): Profile {
	const isWindowsSpoof = getConfig("spoofWindows");
	const fullChromeVersion = process.versions.chrome;
	const majorVersion = fullChromeVersion.split(".")[0];

	const targetPlatform = isWindowsSpoof ? "win32" : (process.platform as "win32" | "darwin" | "linux");
	const targetArch = isWindowsSpoof ? "x64" : process.arch;

	let targetVersion = "10.0";
	if (!isWindowsSpoof) {
		if (process.platform === "darwin") {
			targetVersion = process.getSystemVersion?.() || "12.0.0";
		} else {
			targetVersion = release();
		}
	}

	let jsPlatform = "Win32";
	if (targetPlatform === "darwin") jsPlatform = "MacIntel";
	else if (targetPlatform === "linux") jsPlatform = "Linux x86_64";

	const uaString = generateUserAgentString(targetPlatform, majorVersion);
	const clientHints = generateClientHints(targetPlatform, targetArch, targetVersion, fullChromeVersion);

	return {
		userAgent: uaString,
		platform: jsPlatform,
		metadata: clientHints,
	};
}

export async function spoofChrome(mainWindow: BrowserWindow) {
	mainWindow.webContents.userAgent = profile.userAgent;

	if (!getConfig("spoofChrome")) return;

	const applySpoofing = async () => {
		try {
			if (!mainWindow.webContents.debugger.isAttached()) {
				try {
					mainWindow.webContents.debugger.attach("1.3");
				} catch (err) {
					console.warn(`${logPrefix} Debugger attach warning:`, err);
				}
			}

			console.info(`${logPrefix} Applying UA: ${profile.metadata.platform} (${profile.metadata.architecture})`);

			// https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setUserAgentOverride
			await mainWindow.webContents.debugger.sendCommand("Emulation.setUserAgentOverride", {
				userAgent: profile.userAgent,
				platform: profile.platform,
				userAgentMetadata: profile.metadata,
			});
		} catch (error) {
			console.error(`${logPrefix} Failed to apply user agent override:`, error);
		}
	};

	mainWindow.webContents.debugger.on("detach", (_e, reason) => {
		console.info(`${logPrefix} Debugger detached: ${reason}`);
	});

	// Reapply on reloads. Should be sufficient?
	mainWindow.webContents.on("did-navigate", async () => {
		await applySpoofing();
	});

	await applySpoofing();
}

export const profile = getProfile();
