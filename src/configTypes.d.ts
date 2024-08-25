// This file is auto-generated. Any changes will be lost. See genSettingsTypes.mjs script
export interface Config {
    "customTitlebar": boolean;
    "minimizeToTray": boolean;
    "startMinimized": boolean;
    "dynamicIcon": boolean;
    "customIconPath": string;
    "discordUrl": string;
    "modNames": string[];
    "customJsBundle": string;
    "customCssBundle": string;
    "noBundleUpdates": boolean;
    "firewall": boolean;
    "customFirewallRules": boolean;
    "blocklist": string[];
    "blockedStrings": string[];
    "allowedStrings": string[];
    "installDefaultShelterPlugins": boolean;
    "invidiousEmbeds": boolean;
    "messageEncryption": boolean;
    "encryptionPasswords": string[];
    "encryptionCover": string;
    "encryptionMark": string;
    "arrpc": boolean;
    "scriptLoading": boolean;
    "launchWithOsBoot": boolean;
    "spellcheck": boolean;
    "popoutWindowAlwaysOnTop": boolean;
    "updateNotification": boolean;
    "autoscroll": boolean;
    "transparency": boolean;
    "screensharePreviousSettings": [number, number, boolean, string];
    "cloudHost": string;
    "cloudEncryptionKey": string;
    "cloudToken": string;
    "windowState:main": unknown;
}

export type ConfigKey = keyof Config;