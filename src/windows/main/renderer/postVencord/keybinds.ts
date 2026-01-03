export function initKeybinds() {
	Common.FluxDispatcher.subscribe("KEYBINDS_SET_KEYBIND", () => {
		window.keybinds.updateKeybinds();
	});
}
