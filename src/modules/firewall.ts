import { session } from "electron";
// This file contains everything that uses session.defaultSession.webRequest
import pc from "picocolors";
import { getConfig, getDefaultValue } from "../config.ts";
import type { Config, ConfigKey } from "../configTypes.d.ts";

function getConfigOrDefault<K extends ConfigKey>(toGet: K): Config[K] {
	return getConfig("customFirewallRules") ? getConfig(toGet) : getDefaultValue(toGet);
}

export async function initializeFirewall() {
	if (!getConfig("firewall")) return;
	const blocklist = getConfigOrDefault("blocklist");
	const blockedStrings = getConfigOrDefault("blockedStrings");
	const allowedStrings = getConfigOrDefault("allowedStrings");

	// If blocklist is not empty
	if (blocklist[0] !== "") {
		// Blocking URLs. This list works in tandem with "blockedStrings" list.
		session.defaultSession.webRequest.onBeforeRequest(
			{
				urls: blocklist,
			},
			(_, callback) => callback({ cancel: true }),
		);
	}

	/* If the request url includes any of those, it is blocked.
	 * By doing so, we can match multiple unwanted URLs, making the blocklist cleaner and more efficient */
	const blockRegex = new RegExp(blockedStrings.join("|"), "i"); // 'i' flag for case-insensitive matching
	const allowRegex = new RegExp(allowedStrings.join("|"), "i");

	session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ["<all_urls>"] }, (details, callback) => {
		if (details.resourceType !== "xhr") {
			// Filtering out non-xhr requests for performance
			callback({ cancel: false });
			return;
		}

		if (blockRegex.test(details.url)) {
			if (!allowRegex.test(details.url)) {
				callback({ cancel: true });
				return;
			}
		}

		callback({ cancel: false });
	});

	console.log(pc.red("[Firewall]"), "Firewall initialized");
}

export async function unstrictCSP() {
	session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, done) => {
		if (!responseHeaders) return done({});

		//responseHeaders["access-control-allow-origin"] = ["*"];
		if (resourceType === "mainFrame" || resourceType === "subFrame") {
			responseHeaders["content-security-policy"] = [""];
		} else if (resourceType === "stylesheet") {
			// Fix hosts that don't properly set the css content type, such as
			// raw.githubusercontent.com
			responseHeaders["content-type"] = ["text/css"];
		}
		done({ responseHeaders });
	});
	console.log(pc.red("[Firewall]"), "Set up CSP unstricter");
}
