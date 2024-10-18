/*
    https://github.com/SpacingBat3/WebCord

	MIT License

	Copyright (c) 2020-2023 Dawid Papiewski "SpacingBat3"

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/
import { release } from "node:os";

interface AgentReplace {
	platform: string;
	version: string;
	arch: string;
	device?: string | undefined;
}

const agentArchMap = Object.freeze({
	arm64: "aarch64",
	arm: "armv7",
	ia32: "x86",
	x64: "x86_64",
} as const);

const toAgentCase = (s: string) => (s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase()).replace("bsd", "BSD").replace("os", "OS");

/**
 * Generates fake Chrome/Chromium user agent string to use instead Electron ones.
 *
 * This way, pages identifies Electron client as regular Chromium browser.
 *
 * To make it even harder to detect, it even uses current operating system version in
 * the user agent string (via `process.getSystemVersion()` in Electron API).
 *
 * @param chromeVersion Chrome/Chromium version string to use.
 * @param mobile Whenever user-agent should be for mobile devices.
 * @param replace Generate user-agent from provided `replace` data.
 * @returns Fake Chrome/Chromium user agent string.
 */
export function getUserAgent(chromeVersion: string, mobile?: boolean, replace?: AgentReplace) {
	const userAgentPlatform = replace?.platform ?? process.platform;
	const osVersion = replace?.version ?? (typeof process.getSystemVersion === "function" ? process.getSystemVersion() : userAgentPlatform === "darwin" ? "13.5.2" : release());
	const device = replace?.device !== undefined ? (`; ${replace.device}` as const) : "";
	const mobileAgent = (mobile ?? false) ? " Mobile" : "";
	switch (userAgentPlatform as NodeJS.Platform) {
		case "darwin":
			return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVersion.replace(".", "_")}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}${mobileAgent} Safari/537.36` as const;
		case "win32": {
			const wow64 = (replace?.arch ?? process.arch).endsWith("64") ? "Win64; x64" : "Win32";
			return `Mozilla/5.0 (Windows NT ${osVersion}; ${wow64}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}${mobileAgent} Safari/537.36` as const;
		}
		case "android":
			return `Mozilla/5.0 (Linux; Android ${osVersion}${device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}${mobileAgent} Safari/537.36` as const;
		default: {
			const arch = (replace?.arch !== undefined && replace.arch in agentArchMap ? agentArchMap[replace.arch as keyof typeof agentArchMap] : replace?.arch) ?? (process.arch in agentArchMap ? agentArchMap[process.arch as keyof typeof agentArchMap] : process.arch);
			return `Mozilla/5.0 (X11; ${toAgentCase(userAgentPlatform)} ${arch}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}${mobileAgent} Safari/537.36` as const;
		}
	}
}
