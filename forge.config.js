/*
 * Electron Forge Config (configForge.js)
 */

const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const rimraf = require("rimraf");
const {join} = require("path");
const {readdirSync, unlinkSync} = require("graceful-fs");

// Global variables in the config:
const iconFile = "./build/icon";
const desktopGeneric = "Internet Messenger";
const desktopCategories = (["Network", "InstantMessaging"]);

const config = {
  buildIdentifier: "release",
  rebuildConfig: {
    disablePreGypCopy: true,
    onlyModules: []
  },
  packagerConfig: {
    executableName: "GoofCord",
    asar: true,
    icon: iconFile,
    extraResource: [
      "LICENSE"
    ],
    ignore: [
      "^dist$",
      "^out$",
      /^\.[a-z]+$/,
      /.*\/\.[a-z]+$/
    ],
    junk: false,
    usageDescription: {
      Microphone: "This lets this app to internally manage the microphone access.",
      Camera: "This lets this app to internally manage the camera access."
    }
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        setupIcon: iconFile+".ico",
        noMsi: true,
        loadingGif: "./assetsDev/gf_install_animation.gif"
      }
    },
    {
      name: "@reforged/maker-appimage",
      config: {
        options: {
          genericName: desktopGeneric,
          categories: desktopCategories,
          flagsFile: true,
          type2runtime: true
        }
      }
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          section: "web",
          genericName: desktopGeneric,
          categories: desktopCategories,
          homepage: 'https://github.com/Milkshiift/GoofCord'
        }
      }
    }
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableCookieEncryption]: true
    }),
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ],
  hooks: {
    // remove folders & files not to be included in the app
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      // folders & files to be included in the app
      const appItems = [
        'assets',
        'ts-out',
        'package.json',
        'node_modules'
      ];

      readdirSync(buildPath).filter((item) => {
        return appItems.indexOf(item) === -1
      }).forEach((item) => {
        rimraf.sync(join(buildPath, item));
      });
    },

    // remove unused locales
    postPackage: async (config, packageResult) => {
      const dirPath = join(packageResult.outputPaths[0], "locales");
      const files = readdirSync(dirPath);

      for (const file of files) {
        const filePath = join(dirPath, file);

        if (file !== "en-US.pak") {
          unlinkSync(filePath);
        }
      }
    }
  }
};

module.exports = config;