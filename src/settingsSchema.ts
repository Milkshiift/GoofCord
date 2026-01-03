// @ts-expect-error See /build/globbyGlob.ts
import allLangs from "glob-filenames:../assets/lang/*.json";

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
] as const;

export type InputTypeMap = {
	checkbox: boolean;
	textfield: string;
	dropdown: string;
	"dropdown-multiselect": string[];
	file: string;
	textarea: string[];
	dictionary: Record<string, string>;
};

export type OutputTypeMap = {
	string: string;
	number: number;
	boolean: boolean;
	object: Record<string, unknown>;
	"string[]": string[];
	"[number, number, boolean, string]": [number, number, boolean, string];
	"[boolean, [number, number]]": [boolean, [number, number]];
};

export interface BaseEntry {
	description?: string;
}

// biome-ignore lint/suspicious/noExplicitAny: Wawa
export type SettingEntry<K extends keyof InputTypeMap = keyof InputTypeMap> = K extends any
	? {
			name: string;
			inputType: K;
			defaultValue: InputTypeMap[K];
			accept?: string;
			encrypted?: boolean;
			options?: readonly string[] | readonly [string, string][] | Record<string, unknown>;
			showAfter?: {
				key: string;
				condition: (value: unknown) => boolean;
			};
			onChange?: string;
		} & BaseEntry
	: never;

// biome-ignore lint/suspicious/noExplicitAny: Wawa
export type HiddenEntry<K extends keyof OutputTypeMap = keyof OutputTypeMap> = K extends any
	? {
			name?: never;
			inputType?: never;
			outputType: K;
			defaultValue: OutputTypeMap[K];
		} & BaseEntry
	: never;

export interface ButtonEntry {
	name: string;
	onClick: string;
}

export type SchemaEntry = SettingEntry | HiddenEntry | ButtonEntry;
export type SchemaStructure = Record<string, Record<string, SchemaEntry>>;

function setting<K extends keyof InputTypeMap>(inputType: K, config: Omit<SettingEntry<K>, "inputType">): SettingEntry<K> {
	// @ts-expect-error
	return { inputType, ...config };
}

function hidden<K extends keyof OutputTypeMap>(outputType: K, defaultValue: OutputTypeMap[K], config?: Omit<HiddenEntry<K>, "outputType" | "defaultValue">): HiddenEntry<K> {
	// @ts-expect-error
	return { outputType, defaultValue, ...config };
}

function button(name: string, onClick: string): ButtonEntry {
	return { name, onClick };
}

export const settingsSchema = {
	General: {
		locale: setting("dropdown", {
			name: "Language 🌍",
			defaultValue: "en-US",
			description: 'This is different from Discord\'s language. You can translate GoofCord <a target="_blank" href="https://hosted.weblate.org/projects/goofcord/goofcord/">here</a>.',
			options: allLangs,
			onChange: "settings:hotreloadLocale",
		}),
		discordUrl: setting("textfield", {
			name: "Discord URL",
			defaultValue: "https://discord.com/app",
			description: 'URL that GoofCord will load on launch. Add "canary." or "ptb." before "discord.com" for respective instances.',
		}),
		arrpc: setting("checkbox", {
			name: "Activity display",
			defaultValue: false,
			description:
				'Enables an open source reimplementation of Discord\'s\nrich presence called <a target="_blank" href="https://github.com/OpenAsar/arrpc">arRPC</a>.\nA <a target="_blank" href="https://github.com/flathub/io.github.milkshiift.GoofCord?tab=readme-ov-file#discord-rich-presence">workaround</a> is needed for arRPC to work on Flatpak',
			onChange: "arrpc:initArrpc",
		}),
		minimizeToTray: setting("checkbox", {
			name: "Minimize to tray",
			defaultValue: true,
			description: "GoofCord stays open even after closing all windows.",
		}),
		startMinimized: setting("checkbox", {
			name: "Start minimized",
			defaultValue: false,
			description: "GoofCord starts in the background.",
		}),
		launchWithOsBoot: setting("checkbox", {
			name: "Launch GoofCord on startup",
			defaultValue: false,
			description: "Start GoofCord automatically on system boot. May not work in some Linux environments.",
			onChange: "loader:setAutoLaunchState",
		}),
		updateNotification: setting("checkbox", {
			name: "Update notification",
			defaultValue: true,
			description: "Get notified about new version releases.",
		}),
		spellcheck: setting("checkbox", {
			name: "Spellcheck",
			defaultValue: true,
			description: "Enables spellcheck for input fields.",
		}),
		spellcheckLanguages: setting("dropdown-multiselect", {
			name: "Spellcheck languages",
			defaultValue: [], // Inferred as string[] automatically
			description: "A list of languages to check spelling for. When none are selected, the system default is used.",
			options: spellcheckLangs,
			showAfter: {
				key: "spellcheck",
				condition: (value) => !!value,
			},
		}),
	},
	Appearance: {
		customTitlebar: setting("checkbox", {
			name: "Custom titlebar",
			defaultValue: true,
			description: "Enables a Discord-like titlebar.",
		}),
		disableAltMenu: setting("checkbox", {
			name: "Disable application menu",
			defaultValue: false,
			description: "Stops Alt key from opening the app menu.",
			showAfter: {
				key: "customTitlebar",
				condition: (value) => value === false,
			},
		}),
		staticTitle: setting("checkbox", {
			name: "Static title",
			defaultValue: false,
			description: "Prevent Discord from changing the window title.",
		}),
		dynamicIcon: setting("checkbox", {
			name: "Dynamic icon",
			defaultValue: true,
			description: "Shows pings/mentions count on GoofCord's icon and its tray. On Linux, pings on the taskbar only work when unitylib is installed.",
		}),
		unreadBadge: setting("checkbox", {
			name: "Unread badge",
			defaultValue: false,
			description: "Shows if you have any unread messages on GoofCord's icon as a dot.",
			showAfter: {
				key: "dynamicIcon",
				condition: (value) => value === true,
			},
		}),
		customIconPath: setting("file", {
			name: "Custom Icon",
			defaultValue: "",
			description: "Select an alternative icon for GoofCord to use. Images with transparency are recommended.",
			accept: "image/*",
		}),
		trayIcon: setting("dropdown", {
			name: "Tray icon",
			defaultValue: "default",
			description: "What tray icon to use. Symbolic attempts to mimic Gnome's monochromatic icons.",
			options: ["default", "symbolic_black", "symbolic_white"],
			showAfter: {
				key: "trayIcon",
				condition: () => process.platform === "linux",
			},
		}),
		autoscroll: setting("checkbox", {
			name: "Auto-scroll",
			defaultValue: false,
			description: "Enables auto-scrolling with middle mouse button.",
			showAfter: {
				key: "autoscroll",
				condition: () => process.platform === "linux",
			},
		}),
		popoutWindowAlwaysOnTop: setting("checkbox", {
			name: "Pop out window always on top",
			defaultValue: true,
			description: "Makes voice chat pop out window always stay above other windows.",
		}),
		transparency: setting("checkbox", {
			name: "Transparency",
			defaultValue: false,
			description: "Makes the window transparent for use with translucent themes.",
		}),
		disableSettingsAnimations: setting("checkbox", {
			name: "Disable settings animations",
			defaultValue: false,
			description: "Disables all animations in this window.",
			onChange: "settings:reloadWindow",
		}),
	},
	Assets: {
		assets: setting("dictionary", {
			name: "External Assets",
			description: 'See <a target="_blank" href="https://github.com/Milkshiift/GoofCord/wiki/Asset-Loader">wiki</a>. Scripts and styles specified here will be downloaded on launch. Make sure to also include the styles of a client mod, if it uses them. Don\'t mix forks of the same mod, like Vencord and Equicord.',
			defaultValue: {
				Vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
				VencordStyles: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
			},
			options: [
				["Vencord", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js"],
				["VencordStyles", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js"],
				["Equicord", "https://github.com/Equicord/Equicord/releases/download/latest/browser.js"],
				["EquicordStyles", "https://github.com/Equicord/Equicord/releases/download/latest/browser.css"],
				["Shelter", "https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js"],
			],
			onChange: "assetDownloader:updateAssetsFull",
		}),
		assetEtags: hidden("object", {}),
		managedFiles: hidden("string[]", []),
		invidiousEmbeds: setting("checkbox", {
			name: "Invidious embeds",
			defaultValue: false,
			description: "Replaces YouTube embeds with Invidious embeds.",
			onChange: "settings:invidiousConfigChanged",
		}),
		invidiousInstance: setting("textfield", {
			name: "Instance",
			defaultValue: "https://invidious.nerdvpn.de",
			description: "What Invidious instance to use. If videos fail to load, try changing it to a different one and disabling auto-updates.",
			onChange: "settings:invidiousConfigChanged",
			showAfter: {
				key: "invidiousEmbeds",
				condition: (value) => value === true,
			},
		}),
		autoUpdateInvidiousInstance: setting("checkbox", {
			name: "Auto-update instance",
			defaultValue: true,
			description: "Automatically finds an available instance with the lowest latency.",
			showAfter: {
				key: "invidiousEmbeds",
				condition: (value) => value === true,
			},
		}),
		lastInvidiousUpdate: hidden("number", 0),
		messageEncryption: setting("checkbox", {
			name: "Message encryption",
			defaultValue: false,
			description: 'See <a target="_blank" href="https://github.com/Milkshiift/GoofCord/wiki/Message-Encryption">message encryption</a>.',
		}),
		encryptionPasswords: setting("textarea", {
			name: "Encryption passwords",
			defaultValue: [],
			description: "Securely stored, encrypted list of passwords that will be used for encryption. A backup in a warm, safe place is recommended. Separate entries with commas.",
			encrypted: true,
			showAfter: {
				key: "messageEncryption",
				condition: (value) => value === true,
			},
		}),
		encryptionCover: setting("textfield", {
			name: "Encryption cover",
			defaultValue: "",
			description: "A message that a user without the password will see. At least two words or empty.",
			showAfter: {
				key: "messageEncryption",
				condition: (value) => value === true,
			},
		}),
		encryptionMark: setting("textfield", {
			name: "Encryption Mark",
			defaultValue: "| ",
			description: "A string that will be prepended to each decrypted message so it's easier to know what messages are encrypted.",
			showAfter: {
				key: "messageEncryption",
				condition: (value) => value === true,
			},
		}),
	},
	Other: {
		domOptimizer: setting("checkbox", {
			name: "DOM optimizer",
			defaultValue: true,
			description: "Defers DOM updates to possibly improve performance. May cause visual artifacts.",
		}),
		renderingOptimizations: setting("checkbox", {
			name: "Rendering optimizations",
			defaultValue: true,
			description: "Applies CSS optimizations to improve scrolling smoothness. May cause text to become blurry if used with some themes.",
		}),
		forceDedicatedGPU: setting("checkbox", {
			name: "Force dedicated GPU",
			defaultValue: false,
			description: "Forces GoofCord to use a dedicated GPU if available.",
		}),
		performanceFlags: setting("checkbox", {
			name: "Performance flags",
			defaultValue: false,
			description: "Enables additional Chromium flags for performance. Recommended ON unless causes issues.",
		}),
		hardwareAcceleration: setting("checkbox", {
			name: "Hardware acceleration",
			defaultValue: true,
			description: "Disabling can help fix some rendering issues.",
		}),
		disableGpuCompositing: hidden("boolean", false),
		spoofChrome: setting("checkbox", {
			name: "Spoof Chrome",
			defaultValue: true,
			description: "Emulates the Chrome web browser to better blend in with normal traffic.",
		}),
		spoofWindows: setting("checkbox", {
			name: "Spoof Windows (VPN block bypass)",
			defaultValue: false,
			description: "Emulates the Windows platform. Enable this if Discord fails to load with a VPN.",
			showAfter: {
				key: "spoofChrome",
				condition: (value) => process.platform !== "win32" && value === true,
			},
		}),
		firewall: setting("checkbox", {
			name: "Firewall",
			defaultValue: true,
			description: "Never disable unless for debugging.",
		}),
		customFirewallRules: setting("checkbox", {
			name: "Custom firewall rules",
			defaultValue: false,
			description: "Override the default rules.",
		}),
		blocklist: setting("textarea", {
			name: "Blocklist",
			defaultValue: [
				"https://*/api/v*/science",
				"https://*/api/v*/applications/detectable",
				"https://*/api/v*/auth/location-metadata",
				"https://*/api/v*/premium-marketing",
				"https://*/api/v*/scheduled-maintenances/upcoming.json",
				"https://*/error-reporting-proxy/*",
				"https://cdn.discordapp.com/bad-domains/*",
				"https://www.youtube.com/youtubei/v*/next?*",
				"https://www.youtube.com/s/desktop/*",
				"https://www.youtube.com/youtubei/v*/log_event?*",
			],
			description: "A list of URLs to block. Each entry must be separated by a comma.",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => value === true,
			},
		}),
		blockedStrings: setting("textarea", {
			name: "Blocked strings",
			defaultValue: ["sentry", "google", "tracking", "stats", "\\.spotify", "pagead", "analytics", "doubleclick"],
			description: "If any of specified strings are in the URL, it will be blocked.",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => value === true,
			},
		}),
		allowedStrings: setting("textarea", {
			name: "Allowed strings",
			defaultValue: ["videoplayback", "discord-attachments", "googleapis", "search", "api.spotify", "discord.com/assets/sentry."],
			description: "If any of specified strings are in the URL, it will *not* be blocked.",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => value === true,
			},
		}),
		screensharePreviousSettings: hidden("[number, number, boolean, string]", [720, 30, false, "motion"]),
		"windowState:main": hidden("[boolean, [number, number]]", [true, [835, 600]]),
		"button-openGoofCordFolder": button("Open GoofCord folder", "settings.openFolder('GoofCord')"),
		"button-clearCache": button("Clear cache", "settings.clearCache()"),
	},
	Cloud: {
		autoSaveCloud: setting("checkbox", {
			name: "Auto save",
			defaultValue: false,
			description: "Automatically save settings to cloud when they change.",
		}),
		cloudHost: setting("textfield", {
			name: "Cloud Host",
			description: 'GoofCord Cloud Server URL. You can self-host it yourself, see the <a target="_blank" href="https://github.com/Wuemeli/goofcord-cloudserver">repository</a>.',
			defaultValue: "https://goofcordcloud.wuemeli.com",
		}),
		cloudToken: hidden("string", ""),
		cloudEncryptionKey: setting("textfield", {
			name: "Cloud Encryption Key",
			defaultValue: "",
			description: "Leave empty to not use encryption and not save message encryption passwords on cloud. You can't recover your password if you lose it.",
			encrypted: true,
		}),
		"button-loadFromCloud": button("Load from cloud", "settings.loadCloud()"),
		"button-saveToCloud": button("Save to cloud", "settings.saveCloud()"),
		"button-deleteCloud": button("Delete cloud data", "settings.deleteCloud()"),
	},
} as const satisfies SchemaStructure;

type RawSchema = typeof settingsSchema;
type SectionKeys = keyof RawSchema;
type IsButtonKey<K extends PropertyKey> = K extends `button-${string}` ? true : false;

export type ConfigKey = {
	[S in SectionKeys]: {
		[K in keyof RawSchema[S]]: IsButtonKey<K> extends true ? never : K;
	}[keyof RawSchema[S]];
}[SectionKeys];

type EntryForKey<K extends ConfigKey> = {
	[S in SectionKeys]: K extends keyof RawSchema[S] ? RawSchema[S][K] : never;
}[SectionKeys];

export type Config = {
	[K in ConfigKey]: EntryForKey<K> extends { defaultValue: infer D } ? D : never;
};

let cachedDefaults: Config | null = null;
export function getDefaults(): Config {
	if (cachedDefaults) return cachedDefaults;

	const entries = (Object.values(settingsSchema) as Record<string, SchemaEntry>[]).flatMap((section) =>
		Object.entries(section)
			.filter(([key, entry]) => !key.startsWith("button-") && "defaultValue" in entry)
			.map(([key, entry]) => [key, (entry as SettingEntry | HiddenEntry).defaultValue]),
	);

	cachedDefaults = Object.fromEntries(entries) as Config;
	return cachedDefaults;
}

let cachedDefinitions: Record<string, SchemaEntry> | null = null;
export function getDefinition<K extends ConfigKey>(key: K): EntryForKey<K> {
	if (!cachedDefinitions) {
		const entries = (Object.values(settingsSchema) as Record<string, SchemaEntry>[]).flatMap((section) => Object.entries(section).filter(([k]) => !k.startsWith("button-")));
		cachedDefinitions = Object.fromEntries(entries);
	}

	const definition = cachedDefinitions[key];

	if (!definition) {
		throw new Error(`Setting definition for "${key}" not found.`);
	}

	// biome-ignore lint/suspicious/noExplicitAny: Type inference matches K to the specific entry type via EntryForKey
	return definition as any;
}

export function isEditableSetting(entry: SchemaEntry): entry is SettingEntry {
	return "inputType" in entry;
}
