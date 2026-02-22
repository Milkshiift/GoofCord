// Enables HTTP proxy support
import { session } from "electron";
import pc from "picocolors";
import { getConfig } from "../stores/config/config.main.ts";

export async function initProxy() {
	if (!getConfig("proxy")) return;

	const config = {
		proxyRules: getConfig("proxyRules"),
		proxyBypassRules: getConfig("proxyBypassRules"),
	};

	await session.defaultSession.setProxy(config);
	console.log(pc.red("[Proxy]"), "Proxy initialized");
}
