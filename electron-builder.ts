import { Arch, Configuration } from "electron-builder";
import { execSync } from "node:child_process";

const files = [
    "!*",
    "!node_modules/**/*",
    "ts-out",
    "package.json",
    "LICENSE"
];

export const config: Configuration = {
    artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
    nsis: {
        include: "build/installer.nsh",
        artifactName: "${productName} Setup ${arch}.${ext}"
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
        },
        files: [
            ...files,
            "!ts-out/native/*-win32-*.node"
        ]
    },
    win: {
        icon: "assets/gf_icon.ico",
        target: [
            {
                target: "NSIS",
                arch: [
                    "x64",
                    "ia32",
                    "arm64"
                ]
            }
        ],
        files: [
            ...files,
            "!ts-out/native/*-linux-*.node"
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
        icon: "assets/gf_icon.icns",
        darkModeSupport: true,
        identity: "",
        entitlements: "build/entitlements.mac.plist",
        entitlementsInherit: "build/entitlements.mac.plist",
        extendInfo: {
            NSMicrophoneUsageDescription: "This app needs access to the microphone",
            NSCameraUsageDescription: "This app needs access to the camera",
            "com.apple.security.device.audio-input": true,
            "com.apple.security.device.camera": true
        },
        files: [
            ...files,
            "!ts-out/native/*-linux-*.node",
            "!ts-out/native/*-win32-*.node"
        ]
    },
    electronFuses: {
        runAsNode: false,
        onlyLoadAppFromAsar: true
    },
    beforePack: async (context) => {
        const currentArch = getArchString(context.arch);
        const currentPlatform = context.packager.platform.name;

        const output = execSync(`bun run build --platform=${currentPlatform} --arch=${currentArch}`, { encoding: 'utf-8' });
        console.log(output);
    }
};

function getArchString(arch: Arch): string {
    switch (arch) {
        case Arch.x64: return "x64";
        case Arch.arm64: return "arm64";
        case Arch.ia32: return "ia32";
        case Arch.armv7l: return "armv7l";
        default: return "unknown";
    }
}

export default config;