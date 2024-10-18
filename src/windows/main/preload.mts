import "./bridge.ts";
import fs from "node:fs";
import { ipcRenderer } from "electron";
import { log } from "../../modules/logger.ts";
import { addDefaultPlugins } from "./shelter.ts";
import { injectTitlebar } from "./titlebar.ts";
import { addScript, addStyle } from "../preloadUtils.ts";

function loadAssets() {
	const assets: Record<string, string[][]> = ipcRenderer.sendSync("getAssets");
	for (const script of assets.scripts) {
		void addScript(script[1]).then(() => log(`Loaded script: ${script[0]}`));
	}
	for (const style of assets.styles) {
		void addStyle(style[1]).then(() => log(`Loaded style: ${style[0]}`));
	}
}
loadAssets();

document.addEventListener("DOMContentLoaded", async () => {
	if (!document.location.hostname.includes("discord")) return;

	void injectTitlebar();
	void addDefaultPlugins();
	fixScreenShare();
	fixNotifications();

	window.localStorage.setItem("hideNag", "true"); // Hide "Download Discord Desktop now!" banner

	await addStyle(await fs.promises.readFile(ipcRenderer.sendSync("utils:getAsset", "css/discord.css"), "utf8"));
});

function fixScreenShare() {
	// Content hint setting
	void addScript(`
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
	void addScript(`
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
