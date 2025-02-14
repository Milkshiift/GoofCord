// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script

export type ConfigKey = "locale" | "customTitlebar" | "minimizeToTray" | "startMinimized" | "dynamicIcon" | "customIconPath" | "discordUrl" | "modNames" | "modEtagCache" | "customJsBundle" | "customCssBundle" | "noBundleUpdates" | "installDefaultShelterPlugins" | "invidiousEmbeds" | "messageEncryption" | "encryptionPasswords" | "encryptionCover" | "encryptionMark" | "firewall" | "customFirewallRules" | "blocklist" | "blockedStrings" | "allowedStrings" | "arrpc" | "domOptimizer" | "launchWithOsBoot" | "spellcheck" | "popoutWindowAlwaysOnTop" | "updateNotification" | "autoscroll" | "transparency" | "screensharePreviousSettings" | "windowState:main" | "trayIcon" | "cloudHost" | "cloudToken" | "cloudEncryptionKey";

export type ConfigValue<K extends ConfigKey> = K extends keyof {
    "locale": string;
    "customTitlebar": boolean;
    "minimizeToTray": boolean;
    "startMinimized": boolean;
    "dynamicIcon": boolean;
    "customIconPath": string;
    "discordUrl": string;
    "modNames": string[];
    "modEtagCache": object;
    "customJsBundle": string;
    "customCssBundle": string;
    "noBundleUpdates": boolean;
    "installDefaultShelterPlugins": boolean;
    "invidiousEmbeds": boolean;
    "messageEncryption": boolean;
    "encryptionPasswords": string[];
    "encryptionCover": string;
    "encryptionMark": string;
    "firewall": boolean;
    "customFirewallRules": boolean;
    "blocklist": string[];
    "blockedStrings": string[];
    "allowedStrings": string[];
    "arrpc": boolean;
    "domOptimizer": boolean;
    "launchWithOsBoot": boolean;
    "spellcheck": boolean;
    "popoutWindowAlwaysOnTop": boolean;
    "updateNotification": boolean;
    "autoscroll": boolean;
    "transparency": boolean;
    "screensharePreviousSettings": [number, number, boolean, string];
    "windowState:main": [boolean, [number, number]];
    "trayIcon": string;
    "cloudHost": string;
    "cloudToken": string;
    "cloudEncryptionKey": string;
} ? {
    "locale": string;
    "customTitlebar": boolean;
    "minimizeToTray": boolean;
    "startMinimized": boolean;
    "dynamicIcon": boolean;
    "customIconPath": string;
    "discordUrl": string;
    "modNames": string[];
    "modEtagCache": object;
    "customJsBundle": string;
    "customCssBundle": string;
    "noBundleUpdates": boolean;
    "installDefaultShelterPlugins": boolean;
    "invidiousEmbeds": boolean;
    "messageEncryption": boolean;
    "encryptionPasswords": string[];
    "encryptionCover": string;
    "encryptionMark": string;
    "firewall": boolean;
    "customFirewallRules": boolean;
    "blocklist": string[];
    "blockedStrings": string[];
    "allowedStrings": string[];
    "arrpc": boolean;
    "domOptimizer": boolean;
    "launchWithOsBoot": boolean;
    "spellcheck": boolean;
    "popoutWindowAlwaysOnTop": boolean;
    "updateNotification": boolean;
    "autoscroll": boolean;
    "transparency": boolean;
    "screensharePreviousSettings": [number, number, boolean, string];
    "windowState:main": [boolean, [number, number]];
    "trayIcon": string;
    "cloudHost": string;
    "cloudToken": string;
    "cloudEncryptionKey": string;
}[K] : never;

export type Config = Map<ConfigKey, ConfigValue<ConfigKey>>;