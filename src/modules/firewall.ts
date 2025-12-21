// This file contains everything that uses session.defaultSession.webRequest
import { session } from "electron";
import pc from "picocolors";
import { getConfig, getDefaultValue } from "../config.ts";
import type { ConfigKey, ConfigValue } from "../settingsSchema.ts";

function getConfigOrDefault<K extends ConfigKey>(toGet: K): ConfigValue<K> {
	return getConfig("customFirewallRules") ? getConfig(toGet) : getDefaultValue(toGet);
}

export function initFirewall() {
	if (!getConfig("firewall")) return;
	const blocklist = getConfigOrDefault("blocklist");
	const blockedStrings = getConfigOrDefault("blockedStrings");
	const allowedStrings = getConfigOrDefault("allowedStrings");

	if (!getConfig("modNames").includes("vencord")) {
		// The allowlist includes sentry.js for Vencord's NoTrack plugin to properly block it.
		// But if Vencord is not used, blocking it is more useful.
		allowedStrings.splice(allowedStrings.indexOf("discord.com/assets/sentry."), 1);
	}

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
		// No need to filter non-xhr requests
		if (details.resourceType !== "xhr") return callback({ cancel: false });

		if (blockRegex.test(details.url)) {
			if (!allowRegex.test(details.url)) {
				return callback({ cancel: true });
			}
		}

		callback({ cancel: false });
	});

	console.log(pc.red("[Firewall]"), "Firewall initialized");
}

export function unstrictCSP() {
	session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, done) => {
		if (!responseHeaders) return done({});

		//responseHeaders["access-control-allow-origin"] = ["*"];
		if (resourceType === "mainFrame" || resourceType === "subFrame") {
			responseHeaders["content-security-policy"] = [""];
		} else if (resourceType === "stylesheet") {
			// Fix hosts that don't properly set the css content type, such as raw.githubusercontent.com
			responseHeaders["content-type"] = ["text/css"];
		}
		done({ responseHeaders });
	});
	console.log(pc.red("[Firewall]"), "Set up CSP unstricter");
}
