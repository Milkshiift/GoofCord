import { Configuration } from "electron-builder";

export const config: Configuration = {
    artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
    nsis: {
        include: "build/installer.nsh",
        artifactName: "${productName} Setup ${arch}.${ext}"
    },
    appId: "io.github.milkshiift.GoofCord",
    productName: "GoofCord",
    files: [
        "!*",
        "!node_modules/**/*",
        "ts-out",
        "package.json",
        "LICENSE"
    ],
    linux: {
        icon: "build/icon.icns",
        category: "Network",
        maintainer: "MilkShift",
        target: [
            {
                target: "AppImage",
                arch: [
                    "x64",
                    "arm64",
                    "armv7l"
                ]
            }
        ],
        desktop: {
            entry: {
                Name: "GoofCord",
                GenericName: "Internet Messenger",
                Type: "Application",
                Categories: "Network;InstantMessaging;Chat;",
                Keywords: "discord;goofcord;"
            }
        }
    },
    win: {
        icon: "build/icon.ico",
        target: [
            {
                target: "NSIS",
                arch: [
                    "x64",
                    "ia32",
                    "arm64"
                ]
            }
        ]
    },
    mac: {
        category: "public.app-category.social-networking",
        target: [
            {
                target: "dmg",
                arch: [
                    "x64",
                    "arm64"
                ]
            }
        ],
        icon: "build/icon.icns",
        darkModeSupport: true,
        identity: "",
        entitlements: "build/entitlements.mac.plist",
        entitlementsInherit: "build/entitlements.mac.plist",
        extendInfo: {
            NSMicrophoneUsageDescription: "This app needs access to the microphone",
            NSCameraUsageDescription: "This app needs access to the camera",
            "com.apple.security.device.audio-input": true,
            "com.apple.security.device.camera": true
        }
    },
    electronFuses: {
        runAsNode: false,
        onlyLoadAppFromAsar: true
    }
};

export default config;