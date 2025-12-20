export async function initShelterPlugins() {
	if (!window.goofcord.getConfig("modNames").includes("shelter") || !window.goofcord.getConfig("installDefaultShelterPlugins")) return;

	while (!window.shelter?.plugins?.addRemotePlugin) await new Promise((resolve) => setTimeout(resolve, 1000));

	const defaultPlugins: [string, boolean][] = [
		["https://spikehd.dev/shelter-plugins/shelteRPC/", true],
		["https://milkshiift.github.io/goofcord-shelter-plugins/dynamic-icon/", true],
		["https://milkshiift.github.io/goofcord-shelter-plugins/message-encryption/", true],
		["https://milkshiift.github.io/goofcord-shelter-plugins/invidious-embeds/", true],
		["https://milkshiift.github.io/goofcord-shelter-plugins/settings-category/", true],
	];
	for (const plugin of defaultPlugins) {
		try {
			await window.shelter.plugins.addRemotePlugin(getId(plugin[0]), plugin[0]);
			if (plugin[1]) await window.shelter.plugins.startPlugin(getId(plugin[0]));
		} catch (e) {}
	}
	console.log("Added default Shelter plugins");
	function getId(url: string) {
		return url.replace("https://", "");
	}
}
