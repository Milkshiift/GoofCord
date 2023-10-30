/*
 * Electron Forge Config (configForge.js)
 */

const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const {join, extname} = require("path");
const fs = require("graceful-fs");
const {platform} = require("os");

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
        loadingGif: "./assetsDev/gf_install_animation.gif",
        setupExe: `GoofCord-Setup-${process.argv[4]}.exe`,
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
    },
    {
      name: '@electron-forge/maker-dmg'
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
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      async function cleanUpNodeModules(directory) {
        const files = await fs.promises.readdir(directory);
        for (const file of files) {
          const filePath = join(directory, file);
          const stats = await fs.promises.stat(filePath);

          if (file.includes("esm") === true || file.includes("bundle") === true || extname(file) === '.ts' || extname(file) === '.map') {
            if (stats.isDirectory()) {
              await fs.promises.rm(filePath, {recursive: true, force: true});
            }
            else {
              await fs.promises.unlink(filePath);
            }

          }
          else if (stats.isDirectory()) {
            await cleanUpNodeModules(filePath);
          }
        }
      }
      await cleanUpNodeModules(buildPath)

      // folders & files to be included in the app
      const appItems = [
        'assets',
        'ts-out',
        'package.json',
        'node_modules'
      ];

      // remove root folders & files not to be included in the app
      const files = await fs.promises.readdir(buildPath);
      for (const file of files) {
        const filePath = join(buildPath, file);
        if (appItems.includes(file) === false) {
          await fs.promises.rm(filePath, {recursive: true, force: true});
        }
      }
    },

    // remove unused locales
    postPackage: async (config, packageResult) => {
      if (platform() === "darwin") return;

      const dirPath = join(packageResult.outputPaths[0], "locales");
      const files = await fs.promises.readdir(dirPath);

      for (const file of files) {
        const filePath = join(dirPath, file);

        if (file !== "en-US.pak") {
          await fs.promises.unlink(filePath);
        }
      }
    }
  },
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Milkshiift',
          name: 'GoofCord'
        },
        prerelease: false,
        draft: true
      }
    }
  ]
};

module.exports = config;