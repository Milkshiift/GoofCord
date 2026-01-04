import type arRpcPlugin from "@vencord/types/plugins/arRPC.web";

export function initRichPresence() {
	const plugins = VC.Plugins.plugins;
	const matchingKey = Object.keys(plugins).find(key => key.includes("WebRichPresence"));
	const arRPC = (matchingKey ? plugins[matchingKey] : undefined) as typeof arRpcPlugin;

	if (!arRPC) {
		console.error("WebRichPresence plugin not found");
	}

	GoofCord.arrpc.onActivity(async (dataJson: string) => {
		await VC.Webpack.onceReady;

		await arRPC.handleEvent(new MessageEvent("message", { data: dataJson }));
	});

	GoofCord.arrpc.onInvite(async (code: string) => {
		if (!code) return;

		const { invite } = await Common.InviteActions.resolveInvite(code, "Desktop Modal");
		if (!invite) return;

		await Common.FluxDispatcher.dispatch({
			type: "INVITE_MODAL_OPEN",
			context: "APP",
			code,
			invite,
		});
	});
}
