import "./bridge.ts";
import fs from "node:fs";
import { ipcRenderer, webFrame } from "electron";
import { log } from "../../modules/logger.ts";
import { addDefaultPlugins } from "./shelter.ts";
import { injectTitlebar } from "./titlebar.ts";

console.log("Loading assets...");
const assets: Record<string, string[][]> = ipcRenderer.sendSync("assetLoader:getAssets");
for (const script of assets.scripts) {
	webFrame.executeJavaScript(script[1]).then(() => log(`Loaded script: ${script[0]}`));
}
for (const style of assets.styles) {
	webFrame.insertCSS(style[1]);
	log(`Loaded style: ${style[0]}`);
}

document.addEventListener("DOMContentLoaded", () => {
	if (!document.location.hostname.includes("discord")) return;

	void injectTitlebar();
	void addDefaultPlugins();
	fixScreenShare();
	fixNotifications();

	window.localStorage.setItem("hideNag", "true"); // Hide "Download Discord Desktop now!" banner

	webFrame.insertCSS(fs.readFileSync(ipcRenderer.sendSync("utils:getAsset", "css/discord.css"), "utf8"));
});

function fixScreenShare() {
	// Content hint setting
	void webFrame.executeJavaScript(`
        (() => {
        const original = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = async function (opts) {
            const stream = await original.call(this, opts);
            console.log("Setting stream's content hint");
            
            const videoTrack = stream.getVideoTracks()[0];
            videoTrack.contentHint = window.contentHint || "motion";
            
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) audioTrack.contentHint = "music";
    
            return stream;
        };
        })();
    `);
}

function fixNotifications() {
	// hack to make clicking notifications focus GoofCord
	void webFrame.executeJavaScript(`
        (() => {
        const originalSetter = Object.getOwnPropertyDescriptor(Notification.prototype, "onclick").set;
        Object.defineProperty(Notification.prototype, "onclick", {
            set(onClick) {
            originalSetter.call(this, function() {
                onClick.apply(this, arguments);
                goofcord.window.show();
            })
            },
            configurable: true
        });
        })();
    `);
}
