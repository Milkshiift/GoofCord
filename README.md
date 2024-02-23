<div align="center">
<img src="assetsDev/gf_logo_full.png" width="520" alt="GoofCord logo">
<h2>Take control of your Discord experience with GoofCord – the highly configurable and privacy-focused Discord client.<br>Based on <a href="https://github.com/ArmCord/ArmCord">ArmCord</a>.</h2>
<img src="https://img.shields.io/github/downloads/Milkshiift/GoofCord/total">
<img src="https://img.shields.io/github/license/Milkshiift/GoofCord">
</div>

## Features :sparkles:
- **:lock: With Privacy in mind**: GoofCord blocks all tracking and uses multiple techniques like message encryption to improve your privacy and security. [Learn more](https://github.com/Milkshiift/GoofCord/wiki/Privacy-FAQ)
- **:gear: Your Way, Your Client**: Personalize GoofCord to match your vibe with an array of customization options.
- **:chart_with_upwards_trend: Fast and Performant**: Glide through your chats with GoofCord's superior speed and responsiveness compared to the official client. [Check the Benchmarks!](https://github.com/Milkshiift/GoofCord/wiki/Placeholder)
- **:bookmark: Standalone**: GoofCord is a standalone client, not reliant on the original Discord client in any way.
- **:electric_plug: Plugins & Themes support**: Embrace client mods like [Vencord](https://github.com/Vendicated/Vencord) or [Shelter](https://github.com/uwu/shelter) for a world of plugins and themes.
- **:iphone: Cross-Platform**: Find GoofCord on **Windows**, **Linux** and **macOS**. Sadly we don't support Windows versions lower than 10.    
    
[Full feature list](https://github.com/Milkshiift/GoofCord/wiki)

## Ready to Dive In?
### Windows 🪟

* Install with prebuilt binaries from the [releases](https://github.com/Milkshiift/GoofCord/releases/latest) page.    
Choose `GoofCord-Setup-<YOUR ARCHITECTURE>.exe`, or    
`GoofCord-<VERSION>-win-<YOUR ARCHITECTURE>.zip` and unpack into a directory of your choice.

### Linux 🐧

* Install with prebuilt binaries from the [releases](https://github.com/Milkshiift/GoofCord/releases/latest) page.
* Install from [AUR](https://aur.archlinux.org/packages/goofcord-bin) if you run an Arch-based OS (e.g., Arch Linux, Manjaro). Here's an example using yay:    
`yay -S goofcord-bin`

### macOS 🍏

* Install with prebuilt binaries from the [releases](https://github.com/Milkshiift/GoofCord/releases/latest) page.    
Choose the file ending with `mac-arm64.dmg` if your computer uses Apple Silicon processor. [Mac computers with Apple Silicon](https://support.apple.com/en-us/HT211814)      
Choose the file that ends with `mac-x64.dmg` if your computer uses Intel processor.


Everything you'll need can be found in the Discords settings.    
To open GoofCord settings, look for the topmost button.  
To explore the enchanting world of plugins and themes, head over to the Vencord category within your Discord settings. Have fun!
    
And if you want to compile it yourself, here's how:
1. Install [Node.js](https://nodejs.dev) and [pnpm](https://pnpm.io/installation#using-npm)
2. Grab the source code from the latest release. Getting it from the main branch is not recommended for stable experience.
3. Open the command line in the directory of the source code
4. Install the dependencies with `pnpm install`
5. Package GoofCord with `pnpm run packageWindows` or `pnpm run packageLinux`
6. Find your freshly compiled app in the `dist` folder.

## Burning Questions? We've Got Answers!
### Need Support? Join Our Discord!
[![](https://dcbadge.vercel.app/api/server/CZc4bpnjmm)](https://discord.gg/CZc4bpnjmm)

### Is Using GoofCord Risky Business? 🤔
- While using GoofCord goes against [Discord ToS](https://discord.com/terms#software-in-discord%E2%80%99s-services), rest assured that no one has ever been banned from using it or any client mods.    
GoofCord also does some clever tricks to make Discord think you are just using a web client. 

### How can I access the settings? ⚙️
- Multiple ways:
  - Right-click on the tray icon and click `Open Settings`
  - Open Discord settings, and you should see the top most button in the category "GoofCord", click it, and the settings will pop out for you. 
  - Press `Ctrl+Shift+'` shortcut.

### Seeking the Source Code? 🕵️‍♂️
- You can find our source code on [GitHub](https://github.com/Milkshiift/GoofCord/).
  
### What's the difference between ArmCord and GoofCord? 🤷‍♂️
- ArmCord and GoofCord share an origin, but now, GoofCord has evolved into a distinct client. It has its own unique philosophy, plans, and features, setting it apart as a separate client. You may have expected a comparison list, but it would be really, really pointless.

### Check out our [wiki](https://github.com/Milkshiift/GoofCord/wiki) if you've got questions left

## Credits 🙌

[ArmCord](https://github.com/ArmCord/ArmCord)  
[Discord Sandboxed](https://github.com/khlam/discord-sandboxed)  
[Vencord](https://github.com/Vendicated/Vencord)     
[Vesktop](https://github.com/Vencord/Vesktop)    
[WebCord](https://github.com/SpacingBat3/WebCord)
