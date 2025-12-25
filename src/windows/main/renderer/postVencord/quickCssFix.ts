export function initQuickCssFix() {
	const channel = new BroadcastChannel("quickcss");
	channel.onmessage = async (event) => {
		if (event.data === "get") {
			channel.postMessage(await window.VencordNative.quickCss.get());
		} else {
			await window.VencordNative.quickCss.set(event.data);
		}
	};

	window.VencordNative.quickCss.openEditor = () => void window.goofcord.openQuickCssWindow();
}
