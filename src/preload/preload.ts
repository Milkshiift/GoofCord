import "./bridge";
import fs from "node:fs";
import * as path from "node:path";
import { ipcRenderer } from "electron";
import { log } from "../modules/logger";
import { addScript, addStyle } from "../utils";
import { addDefaultPlugins } from "./shelter";
import { injectTitlebar } from "./titlebar";

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

	// Hide "Download Discord Desktop now!" banner
	window.localStorage.setItem("hideNag", "true");

	addStyle(await fs.promises.readFile(path.join(__dirname, "../", "/assets/css/discord.css"), "utf8"));
});

function fixScreenShare() {
	addScript(`
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
	addScript(`
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
