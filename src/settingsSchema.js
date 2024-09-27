// This is .js so it can be imported by js build scripts. It doesn't really use types anyway

export const settingsSchema = {
	"General settings": {
		//locale: {
		//	name: "Language",
		//	defaultValue: "en-US",
		//	inputType: "dropdown",
		//	options: fs.readdirSync("assets/lang").map((file) => file.replace(".json", "")),
		//},
		customTitlebar: {
			name: "Custom titlebar",
			defaultValue: true,
			description: "Enables a Discord-like titlebar.",
			inputType: "checkbox",
		},
		minimizeToTray: {
			name: "Minimize to tray",
			defaultValue: true,
			description: "GoofCord stays open even after closing all windows.",
			inputType: "checkbox",
		},
		startMinimized: {
			name: "Start minimized",
			defaultValue: false,
			description: "GoofCord starts in the background and remains out of your way.",
			inputType: "checkbox",
		},
		dynamicIcon: {
			name: "Dynamic icon",
			defaultValue: true,
			description: "Shows pings/mentions count on GoofCord's icon and its tray. Overwrites the custom icon.\nOn Linux pings on the taskbar icon only show when Unity launcher or unitylib is used",
			inputType: "checkbox",
		},
		customIconPath: {
			name: "Custom Icon",
			defaultValue: "",
			description: "Select an alternative icon for GoofCord to use. Images with transparency are recommended.",
			inputType: "file",
		},
		discordUrl: {
			name: "Discord URL",
			defaultValue: "https://discord.com/app",
			description: 'URL that GoofCord will load on launch. Add "canary." or "ptb." before "discord.com" for respective instances.',
			inputType: "textfield",
		},
	},
	"Client mods settings": {
		modNames: {
			name: "Client mods",
			defaultValue: ["shelter", "vencord"],
			description:
				'What client mods to use. <b>You shouldn\'t disable Shelter</b> as it is used by many GoofCord features. Do not mix forks of the same mod (e.g. Vencord and Equicord). <a target="_blank" href="https://github.com/Milkshiift/GoofCord/wiki/FAQ#how-do-i-add-a-custom-client-mod">Client mod I want to use is not listed</a>.',
			inputType: "dropdown-multiselect",
			options: ["vencord", "equicord", "shelter", "custom"],
		},
		customJsBundle: {
			name: "Custom JS bundle",
			defaultValue: "",
			description: "",
			inputType: "textfield",
			showAfter: {
				key: "modNames",
				condition: (value) => {
					return value.includes("custom");
				},
			},
		},
		customCssBundle: {
			name: "Custom CSS bundle",
			defaultValue: "",
			description: "A raw link to the JS bundle and CSS bundle of a client mod you want to use.",
			inputType: "textfield",
			showAfter: {
				key: "modNames",
				condition: (value) => {
					return value.includes("custom");
				},
			},
		},
		noBundleUpdates: {
			defaultValue: false,
			inputType: "checkbox",
		},
		installDefaultShelterPlugins: {
			name: "Install default Shelter plugins",
			defaultValue: true,
			description: "Adds GoofCord's helper plugins to Shelter on launch. Don't disable unless facing issues.",
			inputType: "checkbox",
		},
		invidiousEmbeds: {
			name: "Invidious embeds",
			defaultValue: true,
			description: "Replaces YouTube embeds with Invidious embeds. You can customize the instance from Shelter's settings.",
			inputType: "checkbox",
		},
		messageEncryption: {
			name: "Message encryption",
			defaultValue: false,
			description: 'See <a target="_blank" href="https://github.com/Milkshiift/GoofCord/wiki/Message-Encryption">message encryption</a>.',
			inputType: "checkbox",
		},
		encryptionPasswords: {
			name: "Encryption passwords",
			defaultValue: [],
			description: "Securely stored, encrypted list of passwords that will be used for encryption. A backup in a warm, safe place is recommended. Separate entries with commas.",
			inputType: "textarea",
			encrypted: true,
			showAfter: {
				key: "messageEncryption",
				condition: (value) => {
					return value === true;
				},
			},
		},
		encryptionCover: {
			name: "Encryption cover",
			defaultValue: "",
			description: "A message that a user without the password will see. At least two words or empty.",
			inputType: "textfield",
			showAfter: {
				key: "messageEncryption",
				condition: (value) => {
					return value === true;
				},
			},
		},
		encryptionMark: {
			name: "Encryption Mark",
			defaultValue: "| ",
			description: "A string that will be prepended to each decrypted message so it's easier to know what messages are encrypted.",
			inputType: "textfield",
			showAfter: {
				key: "messageEncryption",
				condition: (value) => {
					return value === true;
				},
			},
		},
	},
	"Firewall settings": {
		firewall: {
			name: "Firewall",
			defaultValue: true,
			description: "Never disable unless for debugging.",
			inputType: "checkbox",
		},
		customFirewallRules: {
			name: "Custom firewall rules",
			defaultValue: false,
			description: "Override the default rules.",
			inputType: "checkbox",
		},
		blocklist: {
			name: "Blocklist",
			defaultValue: [
				"https://*/api/v*/science",
				"https://*/api/v*/applications/detectable",
				"https://*/api/v*/auth/location-metadata",
				"https://*/api/v*/premium-marketing",
				"https://*/api/v*/scheduled-maintenances/upcoming.json",
				"https://*/error-reporting-proxy/*",
				"https://*/assets/version.*",
				"https://cdn.discordapp.com/bad-domains/*",
				"https://www.youtube.com/youtubei/v*/next?*",
				"https://www.youtube.com/s/desktop/*",
				"https://www.youtube.com/youtubei/v*/log_event?*",
			],
			description: "A list of URLs to block. Each entry must be separated by a comma.",
			inputType: "textarea",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => {
					return value === true;
				},
			},
		},
		blockedStrings: {
			name: "Blocked strings",
			defaultValue: ["sentry", "google", "tracking", "stats", "\\.spotify", "pagead", "analytics", "doubleclick"],
			description: "If any of specified strings are in the URL, it will be blocked.",
			inputType: "textarea",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => {
					return value === true;
				},
			},
		},
		allowedStrings: {
			name: "Allowed strings",
			defaultValue: ["videoplayback", "discord-attachments", "googleapis", "search", "api.spotify"],
			description: "If any of specified strings are in the URL, it will *not* be blocked.",
			inputType: "textarea",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => {
					return value === true;
				},
			},
		},
	},
	"Other settings": {
		arrpc: {
			name: "Activity display",
			defaultValue: false,
			description:
				'Enables an open source reimplementation of Discord\'s\nrich presence called <a target="_blank" href="https://github.com/OpenAsar/arrpc">arRPC</a>.\nA <a target="_blank" href="https://github.com/flathub/io.github.milkshiift.GoofCord?tab=readme-ov-file#discord-rich-presence">workaround</a> is needed for arRPC to work on Flatpak',
			inputType: "checkbox",
		},
		launchWithOsBoot: {
			name: "Launch GoofCord on startup",
			defaultValue: false,
			description: "Start GoofCord automatically on system boot. May not work in some Linux environments.",
			inputType: "checkbox",
		},
		spellcheck: {
			name: "Spellcheck",
			defaultValue: true,
			description: "Enables spellcheck for input fields.",
			inputType: "checkbox",
		},
		popoutWindowAlwaysOnTop: {
			name: "Pop out window always on top",
			defaultValue: true,
			description: "Makes voice chat pop out window always stay above other windows.",
			inputType: "checkbox",
		},
		updateNotification: {
			name: "Update notification",
			defaultValue: true,
			description: "Get notified about new version releases.",
			inputType: "checkbox",
		},
		autoscroll: {
			name: "Auto-scroll",
			defaultValue: false,
			description: "Enables auto-scrolling with middle mouse button.",
			inputType: "checkbox",
			showAfter: {
				key: "autoscroll",
				condition: (value) => {
					return process.platform === "linux";
				},
			},
		},
		transparency: {
			name: "Transparency",
			defaultValue: false,
			description: "Makes the window transparent for use with translucent themes.",
			inputType: "checkbox",
		},
		screensharePreviousSettings: {
			defaultValue: ["720", "30", false, "motion"],
			outputType: "[number, number, boolean, string]",
		},
		"windowState:main": {
			defaultValue: [true, [0, 0], [835, 600]],
			outputType: "[boolean, [number, number], [number, number]]",
		},
		"button-openGoofCordFolder": {
			name: "Open GoofCord folder",
			onClick: "settings.openFolder('GoofCord')",
		},
		"button-clearCache": {
			name: "Clear cache",
			onClick: "settings.clearCache()",
		},
		"button-forceNativeCrash": {
			name: "Force native crash",
			onClick: "settings.crash()",
		},
	},
	"Cloud Settings": {
		cloudHost: {
			defaultValue: "https://goofcordcloud.wuemeli.com",
			inputType: "textfield",
		},
		cloudToken: {
			defaultValue: "",
			outputType: "string",
		},
		cloudEncryptionKey: {
			name: "Cloud Encryption Key",
			defaultValue: "",
			description: "Leave empty to not use encryption and not save message encryption passwords on cloud. You can't recover your password if you lose it.",
			inputType: "textfield",
			encrypted: true,
		},
		"button-loadFromCloud": {
			name: "Load from cloud",
			onClick: "settings.loadCloud()",
		},
		"button-saveToCloud": {
			name: "Save to cloud",
			onClick: "settings.saveCloud()",
		},
		"button-deleteCloud": {
			name: "Delete cloud data",
			onClick: "settings.deleteCloud()",
		},
	},
};
