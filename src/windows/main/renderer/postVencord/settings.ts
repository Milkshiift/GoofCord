import type SettingsPlugin from "@vencord/types/plugins/_core/settings";

export function initSettingsButton() {
	const Plugin = VC.Plugins.plugins.Settings as unknown as typeof SettingsPlugin;
	if (!Plugin) return;

	let LayoutTypes = {
		SECTION: 1,
		SIDEBAR_ITEM: 2,
		PANEL: 3,
		PANE: 4,
	};
	VC.Webpack.waitFor(["SECTION", "SIDEBAR_ITEM", "PANEL"], (v) => {
		LayoutTypes = v;
	});

	const _originalBuildLayout = Plugin.buildLayout;

	Plugin.buildLayout = (builder) => {
		const layout = _originalBuildLayout.call(Plugin, builder);

		if (builder.key === "$Root") {
			layout.unshift({
				key: "goofcord_section",
				type: LayoutTypes.SECTION,
				useTitle: () => "✨GoofCord✨",
				// @ts-expect-error
				buildLayout: () => [
					{
						type: LayoutTypes.SIDEBAR_ITEM,
						key: "goofcord_settings",
						useTitle: () => "Settings",
						getLegacySearchKey: () => "GOOFCORD",
						legacySearchKey: "GOOFCORD",
						icon: VC.Components.MainSettingsIcon,
						onClick: () => {
							void GoofCord.openSettingsWindow();
						},
						layout: [],
						// buildLayout: () => [{
						//     type: LayoutTypes.PANEL,
						//     key: "goofcord_settings_panel",
						//     useTitle: () => "Wawa",
						//     buildLayout: () => [],
						//     render: window.Vencord.Components.VencordTab,
						//     StronglyDiscouragedCustomComponent: window.Vencord.Components.VencordTab
						// }]
					},
				],
			});
		}

		return layout;
	};

	// TODO: Remove when the settings redesign drops
	const _originalMakeSettingsCategories = Plugin.makeSettingsCategories;
	Plugin.makeSettingsCategories = function (SectionTypes, ...args) {
		const categories = _originalMakeSettingsCategories.call(this, SectionTypes, ...args);

		const goofcordEntries = [
			{
				section: SectionTypes.HEADER,
				label: "✨GoofCord✨",
				className: "goofcord-settings-header"
			},
			{
				section: "goofcord_settings",
				label: "Settings",
				className: "goofcord-settings-item",
				onClick: ()=>{
					void window.goofcord.openSettingsWindow();
				},
			},
			{
				section: SectionTypes.DIVIDER
			},
		];

		categories.unshift(...goofcordEntries);

		return categories;
	};

	window.VencordNative.native.getVersions = GoofCord.getVersions;

	const _originalGetInfoRows = Plugin.getInfoRows.bind(Plugin);
	Plugin.getInfoRows = () => [`GoofCord ${GoofCord.version}`, ..._originalGetInfoRows()];
}
