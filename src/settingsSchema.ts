// @ts-expect-error See /build/globbyGlob.ts
import allLangs from "glob-filenames:../assets/lang/*.json";
import type { ConfigKey, ConfigValue } from "./configTypes";

const spellcheckLangs = [
	"af",
	"bg",
	"ca",
	"cs",
	"cy",
	"da",
	"de",
	"de-DE",
	"el",
	"en",
	"en-AU",
	"en-CA",
	"en-GB",
	"en-GB-oxendict",
	"en-US",
	"es",
	"es-419",
	"es-AR",
	"es-ES",
	"es-MX",
	"es-US",
	"et",
	"fa",
	"fo",
	"fr",
	"fr-FR",
	"he",
	"hi",
	"hr",
	"hu",
	"hy",
	"id",
	"it",
	"it-IT",
	"ko",
	"lt",
	"lv",
	"nb",
	"nl",
	"pl",
	"pt",
	"pt-BR",
	"pt-PT",
	"ro",
	"ru",
	"sh",
	"sk",
	"sl",
	"sq",
	"sr",
	"sv",
	"ta",
	"tg",
	"tr",
	"uk",
	"vi",
];

export interface SettingEntry {
	name: ConfigKey;
	description: string;
	inputType: string;
	defaultValue: ConfigValue<ConfigKey>;
	accept?: string;
	encrypted?: boolean;
	options?: string[];
	showAfter?: {
		key: string;
		condition: (value: unknown) => boolean;
	};
	onChange?: string; // IPC channel to invoke
}

export interface ButtonEntry {
	name: string;
	onClick: string;
}

// https://github.com/Milkshiift/GoofCord/wiki/How-to-develop-GoofCord#entries
export const settingsSchema = {
	General: {
		locale: {
			name: "Language 🌍",
			defaultValue: "en-US",
			description: 'This is different from Discord\'s language. You can translate GoofCord <a target="_blank" href="https://hosted.weblate.org/projects/goofcord/goofcord/">here</a>.',
			inputType: "dropdown",
			options: allLangs,
			onChange: "main:hotreloadLocale",
		},
		discordUrl: {
			name: "Discord URL",
			defaultValue: "https://discord.com/app",
			description: 'URL that GoofCord will load on launch. Add "canary." or "ptb." before "discord.com" for respective instances.',
			inputType: "textfield",
		},
		arrpc: {
			name: "Activity display",
			defaultValue: false,
			description:
				'Enables an open source reimplementation of Discord\'s\nrich presence called <a target="_blank" href="https://github.com/OpenAsar/arrpc">arRPC</a>.\nA <a target="_blank" href="https://github.com/flathub/io.github.milkshiift.GoofCord?tab=readme-ov-file#discord-rich-presence">workaround</a> is needed for arRPC to work on Flatpak',
			inputType: "checkbox",
			onChange: "arrpc:initArrpc",
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
			description: "GoofCord starts in the background.",
			inputType: "checkbox",
		},
		launchWithOsBoot: {
			name: "Launch GoofCord on startup",
			defaultValue: false,
			description: "Start GoofCord automatically on system boot. May not work in some Linux environments.",
			inputType: "checkbox",
			onChange: "loader:setAutoLaunchState",
		},
		updateNotification: {
			name: "Update notification",
			defaultValue: true,
			description: "Get notified about new version releases.",
			inputType: "checkbox",
		},
		spellcheck: {
			name: "Spellcheck",
			defaultValue: true,
			description: "Enables spellcheck for input fields.",
			inputType: "checkbox",
		},
		spellcheckLanguages: {
			name: "Spellcheck languages",
			defaultValue: [],
			description: "A list of languages to check spelling for. When none are selected, the system default is used.",
			inputType: "dropdown-multiselect",
			options: spellcheckLangs,
			showAfter: {
				key: "spellcheck",
				condition: (value) => value,
			},
		},
	},
	Appearance: {
		customTitlebar: {
			name: "Custom titlebar",
			defaultValue: true,
			description: "Enables a Discord-like titlebar.",
			inputType: "checkbox",
		},
		disableAltMenu: {
			name: "Disable application menu",
			defaultValue: false,
			description: "Stops Alt key from opening the app menu.",
			inputType: "checkbox",
			showAfter: {
				key: "customTitlebar",
				condition: (value) => {
					return value === false;
				},
			},
		},
		staticTitle: {
			name: "Static title",
			defaultValue: false,
			description: "Prevent Discord from changing the window title.",
			inputType: "checkbox",
		},
		dynamicIcon: {
			name: "Dynamic icon",
			defaultValue: true,
			description: "Shows pings/mentions count on GoofCord's icon and its tray. On Linux, pings on the taskbar only work when unitylib is installed.",
			inputType: "checkbox",
		},
		unreadBadge: {
			name: "Unread badge",
			defaultValue: false,
			description: "Shows if you have any unread messages on GoofCord's icon as a dot.",
			inputType: "checkbox",
			showAfter: {
				key: "dynamicIcon",
				condition: (value) => {
					return value;
				},
			},
		},
		customIconPath: {
			name: "Custom Icon",
			defaultValue: "",
			description: "Select an alternative icon for GoofCord to use. Images with transparency are recommended.",
			inputType: "file",
			accept: "image/*",
		},
		trayIcon: {
			name: "Tray icon",
			defaultValue: "default",
			description: "What tray icon to use. Symbolic attempts to mimic Gnome's monochromatic icons.",
			inputType: "dropdown",
			options: ["default", "symbolic_black", "symbolic_white"],
			showAfter: {
				key: "trayIcon",
				condition: (value) => {
					return process.platform === "linux";
				},
			},
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
		popoutWindowAlwaysOnTop: {
			name: "Pop out window always on top",
			defaultValue: true,
			description: "Makes voice chat pop out window always stay above other windows.",
			inputType: "checkbox",
		},
		transparency: {
			name: "Transparency",
			defaultValue: false,
			description: "Makes the window transparent for use with translucent themes.",
			inputType: "checkbox",
		},
	},
	"Client Mods": {
		modNames: {
			name: "Client mods",
			defaultValue: ["shelter", "vencord"],
			description:
				'What client mods to use. <b>You shouldn\'t disable Shelter</b> as it is used by many GoofCord features. Do not mix forks of the same mod (e.g. Vencord and Equicord). <a target="_blank" href="https://github.com/Milkshiift/GoofCord/wiki/FAQ#how-do-i-add-a-custom-client-mod">Client mod I want to use is not listed</a>.',
			inputType: "dropdown-multiselect",
			options: ["vencord", "equicord", "shelter", "custom"],
			onChange: "mods:updateModsFull",
		},
		modEtagCache: {
			defaultValue: {},
			outputType: "object",
		},
		customJsBundle: {
			name: "Custom JS bundle",
			defaultValue: "",
			description: "",
			inputType: "textfield",
			showAfter: {
				key: "modNames",
				condition: (value: string[]) => {
					return value.includes("custom");
				},
			},
			onChange: "mods:updateModsFull",
		},
		customCssBundle: {
			name: "Custom CSS bundle",
			defaultValue: "",
			description: "A raw link to the JS bundle and CSS bundle of a client mod you want to use.",
			inputType: "textfield",
			showAfter: {
				key: "modNames",
				condition: (value: string[]) => {
					return value.includes("custom");
				},
			},
			onChange: "mods:updateModsFull",
		},
		noBundleUpdates: {
			defaultValue: false,
			inputType: "checkbox",
		},
		installDefaultShelterPlugins: {
			defaultValue: true,
			outputType: "boolean",
		},
		invidiousEmbeds: {
			name: "Invidious embeds",
			defaultValue: false,
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
				condition: (value: boolean) => {
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
				condition: (value: boolean) => {
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
				condition: (value: boolean) => {
					return value === true;
				},
			},
		},
	},
	Other: {
		domOptimizer: {
			name: "DOM optimizer",
			defaultValue: true,
			description: "Defers DOM updates to possibly improve performance. May cause visual artifacts.",
			inputType: "checkbox",
		},
		renderingOptimizations: {
			name: "Rendering optimizations",
			defaultValue: true,
			description: "Applies CSS optimizations to improve scrolling smoothness. May cause text to become blurry if used with some themes.",
			inputType: "checkbox",
		},
		forceDedicatedGPU: {
			name: "Force dedicated GPU",
			defaultValue: false,
			description: "Forces GoofCord to use a dedicated GPU if available.",
			inputType: "checkbox",
		},
		performanceFlags: {
			name: "Performance flags",
			defaultValue: false,
			description: "Enables additional Chromium flags for performance. Recommended ON unless causes issues.",
			inputType: "checkbox",
		},
		disableGpuCompositing: {
			defaultValue: false,
			outputType: "boolean",
		},
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
				condition: (value: boolean) => {
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
				condition: (value: boolean) => {
					return value === true;
				},
			},
		},
		allowedStrings: {
			name: "Allowed strings",
			defaultValue: ["videoplayback", "discord-attachments", "googleapis", "search", "api.spotify", "discord.com/assets/sentry."],
			description: "If any of specified strings are in the URL, it will *not* be blocked.",
			inputType: "textarea",
			showAfter: {
				key: "customFirewallRules",
				condition: (value: boolean) => {
					return value === true;
				},
			},
		},
		screensharePreviousSettings: {
			defaultValue: ["720", "30", false, "motion"],
			outputType: "[number, number, boolean, string]",
		},
		"windowState:main": {
			defaultValue: [true, [835, 600]],
			outputType: "[boolean, [number, number]]",
		},
		"button-openGoofCordFolder": {
			name: "Open GoofCord folder",
			onClick: "settings.openFolder('GoofCord')",
		},
		"button-clearCache": {
			name: "Clear cache",
			onClick: "settings.clearCache()",
		},
	},
	Cloud: {
		autoSaveCloud: {
			name: "Auto save",
			defaultValue: false,
			description: "Automatically save settings to cloud when they change.",
			inputType: "checkbox",
		},
		cloudHost: {
			name: "Cloud Host",
			description: 'GoofCord Cloud Server URL. You can self-host it yourself, see the <a target="_blank" href="https://github.com/Wuemeli/goofcord-cloudserver">repository</a>.',
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
