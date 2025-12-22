import type arRpcPlugin from "@vencord/types/plugins/arRPC.web";

export function initRichPresence() {
	const arRPC = Vencord.Plugins.plugins["WebRichPresence (arRPC)"] as typeof arRpcPlugin;

	GoofCord.arrpc.onActivity(async (dataJson: string) => {
		await Vencord.Webpack.onceReady;

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
