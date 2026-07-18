import { execSync } from "node:child_process";

import { Arch, Configuration, Platform } from "electron-builder";

const files = ["!*", "!node_modules/**/*", "ts-out", "package.json", "LICENSE"];

export const config: Configuration = {
	artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
	nsis: {
		include: "build/installer.nsh",
		artifactName: "${productName} Setup ${arch}.${ext}",
	},
	appId: "io.github.milkshiift.GoofCord",
	productName: "GoofCord",
	files: files,
	linux: {
		icon: "assets/gf_icon.icns",
		category: "Network",
		maintainer: "MilkShift",
		target: [
			{
				target: "AppImage",
				arch: ["x64", "arm64", "armv7l"],
			},
		],
		desktop: {
			entry: {
				Name: "GoofCord",
				GenericName: "Internet Messenger",
				Type: "Application",
				Categories: "Network;InstantMessaging;Chat;",
				Keywords: "discord;goofcord;",
			},
		}
	},
	win: {
		icon: "assets/gf_icon.ico",
		target: [
			{
				target: "NSIS",
				arch: ["x64", "ia32", "arm64"],
			},
		]
	},
	mac: {
		category: "public.app-category.social-networking",
		target: [
			{
				target: "dmg",
				arch: ["x64", "arm64"],
			},
		],
		icon: "assets/gf_icon.icns",
		darkModeSupport: true,
		identity: "",
		entitlements: "build/entitlements.mac.plist",
		entitlementsInherit: "build/entitlements.mac.plist",
		extendInfo: {
			NSMicrophoneUsageDescription: "This app needs access to the microphone",
			NSCameraUsageDescription: "This app needs access to the camera",
			"com.apple.security.device.audio-input": true,
			"com.apple.security.device.camera": true,
		}
	},
	electronFuses: {
		runAsNode: false,
		onlyLoadAppFromAsar: true,
	},
	electronLanguages: ["en-US"],
	extraResources: [
		{
			from: "node_modules/patchcord/dist/patchcord-${os}-${arch}",
			to: "patchcord",
			filter: ["**/*"],
		},
		{
			from: "node_modules/goofbind/dist/goofbind-${os}-${arch}",
			to: "goofbind",
			filter: ["**/*"],
		},
		{
			from: "node_modules/goofbind/dist/goofbind-${os}-${arch}.exe",
			to: "goofbind.exe",
			filter: ["**/*"],
		},
	],
	beforePack: async (context) => {
		const output = execSync(`bun run build --skipTypecheck`, {
			encoding: "utf-8",
		});
		console.log(output);
	},
};

export default config;
