<div align="center">
<img src="assetsDev/gf_logo_full.png" width="520" alt="GoofCord logo">
<h2>Take control of your Discord experience with GoofCord – the highly configurable and privacy-focused Discord client.<br><sub>Based on <a href="https://github.com/Legcord/Legcord">Legcord</a></sub></h2>
<img src="https://img.shields.io/github/downloads/Milkshiift/GoofCord/total">
<a href="https://github.com/vshymanskyy/StandWithUkraine/blob/main/docs/README.md"><img src="https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg"></a>
<img src="https://img.shields.io/github/license/Milkshiift/GoofCord">
<a href="https://hosted.weblate.org/engage/goofcord/">
<img src="https://hosted.weblate.org/widget/goofcord/goofcord/svg-badge.svg" alt="Translation status" />
</a><br>
<img src="assetsDev/screenshot1_rounded.png" width="520" alt="Screenshot of GoofCord">
</div>

## Features :sparkles:
- **:lock: With Privacy in mind**: GoofCord blocks all tracking and uses multiple techniques like message encryption to improve your privacy and security. [Learn more](https://github.com/Milkshiift/GoofCord/wiki/Privacy-FAQ)
- **:gear: Your Way, Your Client**: Set up GoofCord to your liking with an array of customization options.
- **:chart_with_upwards_trend: Fast and Performant**: Glide through your chats with GoofCord's superior speed and responsiveness compared to the official client. 
- **:bookmark: Standalone**: GoofCord is a standalone application, not reliant on the original Discord client in any way.
- **:electric_plug: Plugins & Themes support**: Easily use client mods like [Vencord](https://github.com/Vendicated/Vencord), [Equicord](https://github.com/Equicord/Equicord) or [Shelter](https://github.com/uwu/shelter) for a world of plugins and themes.
- **🐧 Linux support**: Seamless screensharing with audio and native Wayland support on Linux. See FAQ for details.

## Installation
### Windows 🪟

* Install with prebuilt binaries from the [releases](https://github.com/Milkshiift/GoofCord/releases/latest) page.    
Choose `GoofCord-Setup-<YOUR ARCHITECTURE>.exe` for an installer, or    
`GoofCord-<VERSION>-win-<YOUR ARCHITECTURE>.zip` to manually unpack into a directory of your choice.
* Install using **winget**: `winget install GoofCord`

### Linux 🐧

* Install with prebuilt binaries from the [releases](https://github.com/Milkshiift/GoofCord/releases/latest) page.
* Install from [Flathub](https://flathub.org/apps/io.github.milkshiift.GoofCord)
* Install from [AUR](https://aur.archlinux.org/packages/goofcord-bin) if you run an **Arch**-based OS. Here's an example using yay:    
`yay -S goofcord-bin`    
Keep in mind that the AUR package is not maintained by the developers of GoofCord.
* Install in **NixOS** from [nixpkgs](https://search.nixos.org/packages?channel=unstable&query=goofcord).

### macOS 🍏
Note: As I don't have a macOS device, macOS support is limited.
* Install with prebuilt binaries from the [releases](https://github.com/Milkshiift/GoofCord/releases/latest) page.    
Choose the file ending with `mac-arm64.dmg` if your computer uses an Apple Silicon processor. [Mac computers with Apple Silicon](https://support.apple.com/en-us/HT211814)      
Otherwise, choose the file that ends with `mac-x64.dmg`
* If you get an error like "GoofCord is damaged and can't be opened" see [this issue](https://github.com/Milkshiift/GoofCord/issues/7) 

To explore plugins and themes, head over to the Vencord category in the Discord settings.
    
And if you want to compile it yourself, here's how:
1. Install [Node.js](https://nodejs.dev) *and* [Bun](https://bun.sh) for package management and bundling.
2. Grab the source code from the latest release. Getting it from the main branch is not recommended for a stable experience.
3. Open a command line in the directory of the source code
4. Install the dependencies with `bun install`
5. Package GoofCord with either `bun run packageWindows`, `bun run packageLinux` or `bun run packageMac`
6. Find your freshly compiled app in the `dist` folder.

## Short FAQ
### Need Support? Join Our Discord!
[![](https://dcbadge.vercel.app/api/server/CZc4bpnjmm)](https://discord.gg/CZc4bpnjmm)

### Where is the long FAQ?
- [On the Wiki](https://github.com/Milkshiift/GoofCord/wiki/FAQ)

### How do I develop GoofCord?
- See the development [guide](https://github.com/Milkshiift/GoofCord/wiki/How-to-develop-GoofCord)

### Can I get banned from using GoofCord? 🤔
- While using GoofCord goes against [Discord ToS](https://discord.com/terms#software-in-discord%E2%80%99s-services), no one has ever been banned from using it or any client mods.

### How can I access the settings? ⚙️
- Multiple ways:
  - Right-click on the tray icon and click `Open Settings`
  - Click the "Settings" button in the "GoofCord" category in the Discord settings
  - Press `Ctrl+Shift+'` shortcut.

### How do I run GoofCord natively on Wayland?
- GoofCord should run natively out of the box, but if it doesn't, run with these flags:    
`--enable-features=UseOzonePlatform,WaylandWindowDecorations --ozone-platform-hint=auto`    
If GoofCord shows a black screen, also include this flag: `--disable-gpu-sandbox`

### Seeking the Source Code? 🕵️‍♂️
- You can find our source code on [GitHub](https://github.com/Milkshiift/GoofCord/).

### Check out our [wiki](https://github.com/Milkshiift/GoofCord/wiki) if you've got questions left

## Credits 🙌

[GoofCord Cloud Server](https://github.com/Wuemeli/goofcord-cloudserver)    
[LegCord](https://github.com/Legcord/Legcord)  
[Discord Sandboxed](https://github.com/khlam/discord-sandboxed)  
[Vencord](https://github.com/Vendicated/Vencord)     
[Vesktop](https://github.com/Vencord/Vesktop)    
[WebCord](https://github.com/SpacingBat3/WebCord)

## Donations
If you like GoofCord, you can support me with crypto:
- **XMR (Monero)**: `44FyEbizgCbCaghrtCp2BGQ7WZcNRkwAMNEf9fUzgu6A3wmQq8yqrHiAMu2jT784k6NcSByJUApk8jMREMmUJQeu9g6Dxbq`
- **USDT (Polygon/BEP20)**: `0x48680c916b59e3b254e637fd3cd764fec90aa93e`
- **BTC**: `3F9YHx5KQ5yvYwKfVYcJh5a4HqSfUJyG1w`
