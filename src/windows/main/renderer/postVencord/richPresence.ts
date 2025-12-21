import type arRpcPlugin from "@vencord/types/plugins/arRPC.web";

export function initRichPresence() {
	const arRPC = window.Vencord.Plugins.plugins["WebRichPresence (arRPC)"] as typeof arRpcPlugin;

	window.goofcord.arrpc.onActivity(async (dataJson: string) => {
		await window.Vencord.Webpack.onceReady;

		await arRPC.handleEvent(new MessageEvent("message", { data: dataJson }));
	});

	window.goofcord.arrpc.onInvite(async (code: string) => {
		if (!code) return;

		const { invite } = await window.Vencord.Webpack.Common.InviteActions.resolveInvite(code, "Desktop Modal");
		if (!invite) return;

		await window.Vencord.Webpack.Common.FluxDispatcher.dispatch({
			type: "INVITE_MODAL_OPEN",
			context: "APP",
			code,
			invite,
		});
	});
}
