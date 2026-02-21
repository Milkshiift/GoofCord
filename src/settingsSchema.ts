// @ts-expect-error See /build/globbyGlob.ts
import allLangs from "glob-filenames:../assets/lang/*.json";
import type { ActionKey, ButtonActionMap } from "@root/src/windows/settings/preload/App.tsx";
import packageJson from "../package.json";

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
	list: string[];
	dictionary: Record<string, string>;
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

export type HiddenEntry<T = unknown> = {
	name?: never;
	inputType?: never;
	defaultValue: T;
} & BaseEntry;

export interface ButtonEntry {
	name: string;
	action: ButtonActionTuple;
}

export type ButtonActionTuple = {
	[K in ActionKey]: [K, ...Parameters<ButtonActionMap[K]>];
}[ActionKey];

export type SchemaEntry = SettingEntry | HiddenEntry | ButtonEntry;
export type SchemaStructure = Record<string, Record<string, SchemaEntry>>;

function setting<K extends keyof InputTypeMap>(inputType: K, config: Omit<SettingEntry<K>, "inputType">): SettingEntry<K> {
	// @ts-expect-error
	return { inputType, ...config };
}

function hidden<T>(defaultValue: T, config?: Omit<HiddenEntry<T>, "defaultValue">): HiddenEntry<T> {
	return { defaultValue, ...config };
}

function button<K extends ActionKey>(name: string, key: K, ...args: Parameters<ButtonActionMap[K]>): ButtonEntry {
	return {
		name,
		action: [key, ...args] as unknown as ButtonActionTuple,
	};
}

export const settingsSchema = {
	General: {
		version: hidden(packageJson.version),
		locale: setting("dropdown", {
			name: "Language 🌍",
			defaultValue: "en-US",
			description: 'Controls the UI language of GoofCord, separate from Discord\'s internal language setting. Contribute translations <a target="_blank" href="https://hosted.weblate.org/projects/goofcord/goofcord/">here</a>.',
			options: allLangs,
			onChange: "settings:hotreloadLocale",
		}),
		discordUrl: setting("textfield", {
			name: "Discord URL",
			defaultValue: "https://discord.com/app",
			description: 'The URL loaded on launch. Prepend "canary." or "ptb." to "discord.com" to use those specific instances.',
		}),
		arrpc: setting("checkbox", {
			name: "Rich Presence (arRPC)",
			defaultValue: false,
			description: 'Enables Rich Presence (game activity) via <a target="_blank" href="https://github.com/OpenAsar/arrpc">arRPC</a>. Flatpak users need a <a target="_blank" href="https://github.com/flathub/io.github.milkshiift.GoofCord?tab=readme-ov-file#discord-rich-presence">workaround</a>.',
			onChange: "arrpc:initArrpc",
		}),
		minimizeToTray: setting("checkbox", {
			name: "Minimize to tray",
			defaultValue: true,
			description: "Keeps GoofCord running in the system tray when the window is closed.",
		}),
		startMinimized: setting("checkbox", {
			name: "Start minimized",
			defaultValue: false,
			description: "Launches GoofCord in the background without opening a window.",
		}),
		launchWithOsBoot: setting("checkbox", {
			name: "Launch on startup",
			defaultValue: false,
			description: "Automatically starts GoofCord when you log in. Compatibility varies by Linux environment.",
			onChange: "loader:setAutoLaunchState",
		}),
		updateNotification: setting("checkbox", {
			name: "Update notifications",
			defaultValue: true,
			description: "Show a notification when a new version of GoofCord is released.",
		}),
		spellcheck: setting("checkbox", {
			name: "Spellcheck",
			defaultValue: true,
			description: "Highlights spelling errors in text input fields.",
		}),
		spellcheckLanguages: setting("dropdown-multiselect", {
			name: "Spellcheck languages",
			defaultValue: [],
			description: "Select languages for spellchecking. If no languages are selected, the system default is used.",
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
			description: "Enables an in-Discord titlebar instead of the system default.",
		}),
		disableAltMenu: setting("checkbox", {
			name: "Disable application menu",
			defaultValue: false,
			description: "Prevents the 'Alt' key from triggering the application menu bar.",
			showAfter: {
				key: "customTitlebar",
				condition: (value) => value === false,
			},
		}),
		staticTitle: setting("checkbox", {
			name: "Static title",
			defaultValue: false,
			description: "Prevents Discord from changing the window title (e.g., when switching channels).",
		}),
		dynamicIcon: setting("checkbox", {
			name: "Dynamic icon",
			defaultValue: true,
			description: "Displays a badge for pings/mentions on the taskbar and tray icon. Linux requires unitylib.",
		}),
		unreadBadge: setting("checkbox", {
			name: "Unread badge",
			defaultValue: false,
			description: "Displays a dot on the icon when unread messages are present.",
			showAfter: {
				key: "dynamicIcon",
				condition: (value) => value === true,
			},
		}),
		customIconPath: setting("file", {
			name: "Custom icon",
			defaultValue: "",
			description: "Load a custom image file for the application icon. Transparency recommended.",
			accept: "image/*",
		}),
		trayIcon: setting("dropdown", {
			name: "Tray icon style",
			defaultValue: "default",
			description: "Select the tray icon style. Symbolic icons attempt to match GNOME's monochrome style.",
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
			name: "Popout window always on top",
			defaultValue: true,
			description: "Forces pop-out windows to stay above other windows.",
		}),
		transparency: setting("checkbox", {
			name: "Window transparency",
			defaultValue: false,
			description: "Allows the window to be transparent. Required for translucent themes.",
		}),
		disableSettingsAnimations: setting("checkbox", {
			name: "Disable settings animations",
			defaultValue: false,
			description: "Removes transition animations within this settings menu.",
			onChange: "settings:reloadWindow",
		}),
	},
	Assets: {
		assets: setting("dictionary", {
			name: "External Assets",
			description: `Online scripts and styles loaded on launch. See the <a target="_blank" href="https://github.com/Milkshiift/GoofCord/wiki/Asset-Loader">wiki</a>.<br>
- Ensure you include mod styles if they have them.<br>
- Do not mix forks of the same mod (e.g., Vencord and Equicord).<br>
- GoofCord requires a Vencord-based mod, PreVencord and PostVencord for full functionality.`,
			defaultValue: {
				PreVencord: "https://raw.githubusercontent.com/Milkshiift/GoofCord/refs/heads/main/assets/preVencord.js",
				PostVencord: "https://raw.githubusercontent.com/Milkshiift/GoofCord/refs/heads/main/assets/postVencord.js",
				Vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js",
				VencordStyles: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
			},
			options: [
				["PreVencord", "https://raw.githubusercontent.com/Milkshiift/GoofCord/refs/heads/main/assets/preVencord.js"],
				["PostVencord", "https://raw.githubusercontent.com/Milkshiift/GoofCord/refs/heads/main/assets/postVencord.js"],
				["Vencord", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js"],
				["VencordStyles", "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css"],
				["Equicord", "https://github.com/Equicord/Equicord/releases/download/latest/browser.js"],
				["EquicordStyles", "https://github.com/Equicord/Equicord/releases/download/latest/browser.css"],
				["Shelter", "https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js"],
			],
			onChange: "assetDownloader:updateAssetsFull",
		}),
		dontShowMissingAssetsWarning: hidden(false),
		assetEtags: hidden<Record<string, unknown>>({}),
		managedFiles: hidden<string[]>([]),
		invidiousEmbeds: setting("checkbox", {
			name: "Invidious embeds",
			defaultValue: false,
			description: "Replaces YouTube embeds with Invidious embeds.",
			onChange: "settings:invidiousConfigChanged",
		}),
		invidiousInstance: setting("textfield", {
			name: "Instance",
			defaultValue: "https://invidious.nerdvpn.de",
			description: "The Invidious URL to use. If videos fail to load, try setting a different instance and disabling auto-switch.",
			onChange: "settings:invidiousConfigChanged",
			showAfter: {
				key: "invidiousEmbeds",
				condition: (value) => value === true,
			},
		}),
		autoUpdateInvidiousInstance: setting("checkbox", {
			name: "Auto-switch instance",
			defaultValue: true,
			description: "Automatically finds and switches to the Invidious instance with the lowest latency.",
			showAfter: {
				key: "invidiousEmbeds",
				condition: (value) => value === true,
			},
		}),
		lastInvidiousUpdate: hidden(0),
		messageEncryption: setting("checkbox", {
			name: "Message encryption",
			defaultValue: false,
			description: 'Enables <a target="_blank" href="https://github.com/Milkshiift/GoofCord/wiki/Message-Encryption">message encryption</a> support. You may need to reload twice after enabling.',
		}),
		encryptionPasswords: setting("list", {
			name: "Encryption passwords",
			defaultValue: [],
			description: "A list of passwords used for encryption. They are stored securely. Keep a backup in a safe location.",
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
			name: "Decryption marker",
			defaultValue: "| ",
			description: "A string prepended to decrypted messages to distinguish them from normal text.",
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
			description: "Defers DOM updates to potentially improve performance. May cause visual artifacts.",
		}),
		renderingOptimizations: setting("checkbox", {
			name: "Rendering optimizations",
			defaultValue: true,
			description: "Applies CSS tweaks for smoother scrolling. Text may appear blurry with certain themes.",
		}),
		forceDedicatedGPU: setting("checkbox", {
			name: "Force dedicated GPU",
			defaultValue: false,
			description: "Forces GoofCord to use a dedicated GPU if available.",
		}),
		performanceFlags: setting("checkbox", {
			name: "Performance flags",
			defaultValue: false,
			description: "Enables experimental Chromium flags to boost performance. Disable if facing issues.",
		}),
		hardwareAcceleration: setting("checkbox", {
			name: "Hardware acceleration",
			defaultValue: true,
			description: "Uses GPU for rendering. Disable this if you experience graphical glitches.",
		}),
		vaapi: setting("checkbox", {
			name: "VA-API",
			defaultValue: true,
			description: "Enables the Video Acceleration API (VA-API). Mostly unsupported on Nvidia GPUs.",
			showAfter: {
				key: "hardwareAcceleration",
				condition: (value) => process.platform === "linux" && value === true,
			},
		}),
		disableGpuCompositing: setting("checkbox", {
			name: "Disable GPU compositing",
			defaultValue: false,
			description: "May fix infinitely loading screenshare for viewers, but can also reduce performance in other areas of GoofCord.",
		}),
		spoofChrome: setting("checkbox", {
			name: "Spoof Chrome",
			defaultValue: true,
			description: "Emulates the Chrome web browser to better blend in with normal traffic.",
		}),
		spoofWindows: setting("checkbox", {
			name: "Spoof Windows (VPN Bypass)",
			defaultValue: false,
			description: "Reports the OS as Windows. Enable this if Discord blocks your connection while using a VPN on Linux.",
			showAfter: {
				key: "spoofChrome",
				condition: (value) => process.platform !== "win32" && value === true,
			},
		}),
		firewall: setting("checkbox", {
			name: "Firewall",
			defaultValue: true,
			description: "Blocks known tracking and telemetry. Disable only for debugging.",
		}),
		proxy: setting("checkbox", {
			name: "Proxy",
			defaultValue: false,
			description: "Routes Discord traffic through a specified proxy. Internal GoofCord requests (e.g., fetching external assets) will bypass this proxy.",
		}),
		proxyRules: setting("textfield", {
			name: "Proxy rules",
			defaultValue: "127.0.0.1:8080",
			description: 'Sets Electron proxy rules. See the <a target="_blank" href="https://www.electronjs.org/docs/latest/api/structures/proxy-config">Electron documentation</a> for the schema.',
			showAfter: {
				key: "proxy",
				condition: (value) => value === true,
			},
		}),
		proxyBypassRules: setting("textfield", {
			name: "Proxy bypass rules",
			defaultValue: "<local>",
			description: "Sets the Electron proxy bypass rules.",
			showAfter: {
				key: "proxy",
				condition: (value) => value === true,
			},
		}),
		customFirewallRules: setting("checkbox", {
			name: "Custom firewall rules",
			defaultValue: false,
			description: "Override the default rules.",
		}),
		blocklist: setting("list", {
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
			description: "A list of URL patterns to block.",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => value === true,
			},
		}),
		blockedStrings: setting("list", {
			name: "Blocked strings",
			defaultValue: ["sentry", "google", "tracking", "stats", "\\.spotify", "pagead", "analytics", "doubleclick"],
			description: "Any URL containing these strings will be blocked.",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => value === true,
			},
		}),
		allowedStrings: setting("list", {
			name: "Allowed strings",
			defaultValue: ["videoplayback", "discord-attachments", "googleapis", "search", "api.spotify", "discord.com/assets/sentry."],
			description: "Any URL containing these strings will never be blocked (Whitelist).",
			showAfter: {
				key: "customFirewallRules",
				condition: (value) => value === true,
			},
		}),
		screensharePreviousSettings: hidden<[number, number, boolean, string]>([720, 30, false, "motion"]),
		"windowState:main": hidden<[boolean, [number, number], [number, number]]>([true, [-1, -1], [835, 600]]),
		"button-openGoofCordFolder": button("Open GoofCord folder", "openFolder", "GoofCord"),
		"button-clearCache": button("Clear cache", "clearCache"),
	},
	Cloud: {
		autoSaveCloud: setting("checkbox", {
			name: "Auto-save",
			defaultValue: false,
			description: "Automatically saves settings to the cloud when changed.",
		}),
		cloudHost: setting("textfield", {
			name: "Cloud Host URL",
			description: 'The URL for the Cloud Server. For self-hosting, see the <a target="_blank" href="https://github.com/Wuemeli/goofcord-cloudserver">repository</a>.',
			defaultValue: "https://goofcordcloud.wuemeli.com",
		}),
		cloudToken: hidden(""),
		cloudEncryptionKey: setting("textfield", {
			name: "Cloud Encryption Key",
			defaultValue: "",
			description: "Used to encrypt data sent to the cloud. If lost, your data cannot be recovered. Leave empty to disable encryption and not save message encryption passwords.",
			encrypted: true,
		}),
		"button-loadFromCloud": button("Load from cloud", "loadCloud"),
		"button-saveToCloud": button("Save to cloud", "saveCloud"),
		"button-deleteCloud": button("Delete cloud data", "deleteCloud"),
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
