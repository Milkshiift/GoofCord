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
	domOptimizer();

	window.localStorage.setItem("hideNag", "true"); // Hide "Download Discord Desktop now!" banner

	webFrame.insertCSS(fs.readFileSync(ipcRenderer.sendSync("utils:getAsset", "css/discord.css"), "utf8"));
});

function fixScreenShare() {
	// Content hint + venmic
	void webFrame.executeJavaScript(`
        (() => {
        const original = navigator.mediaDevices.getDisplayMedia;
        
        async function getVirtmic() {
        	try {
        	    const devices = await navigator.mediaDevices.enumerateDevices();
        	    const audioDevice = devices.find(({ label }) => label === "vencord-screen-share");
        	    return audioDevice?.deviceId;
        	} catch (error) {
        	    return null;
        	}
    	}
        
        navigator.mediaDevices.getDisplayMedia = async function (opts) {
            const stream = await original.call(this, opts);
            console.log("Setting stream's content hint and audio device");
            
            const videoTrack = stream.getVideoTracks()[0];
            videoTrack.contentHint = window.contentHint || "motion";
            
            // Default audio sharing
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) audioTrack.contentHint = "music";
            
            // Venmic
            const id = await getVirtmic();
            if (id) {
            	const audio = await navigator.mediaDevices.getUserMedia({
            	    audio: {
            	        deviceId: {
            	            exact: id
            	        },
            	        autoGainControl: false,
            	        echoCancellation: false,
            	        noiseSuppression: false
            	    }
            	});
            	audio.getAudioTracks().forEach(t => stream.addTrack(t));
        	}
    
            return stream;
        };
        
        shelter.flux.dispatcher.subscribe("STREAM_CLOSE", ({streamKey}) => {
			const owner = streamKey.split(":").at(-1);
			if (owner === shelter.flux.stores.UserStore.getCurrentUser().id) {
				goofcord.stopVenmic();
			}
		})
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

function domOptimizer() {
	if (!ipcRenderer.sendSync("config:getConfig", "domOptimizer")) return;
	void webFrame.executeJavaScript(`
        function optimize(orig) {
		    const delayedClasses = ["activity", "gif", "avatar", "imagePlaceholder", "reaction", "hoverBar"];
		
		    return function (...args) {
		        const element = args[0];
		        //console.log(element);
		
		        if (typeof element?.className === "string") {
		            if (delayedClasses.some(partial => element.className.includes(partial))) {
		                //console.log("DELAYED", element.className);
		                setTimeout(() => orig.apply(this, args), 100 - Math.random() * 50);
		                return;
		            }
		        }
		        return orig.apply(this, args);
		    };
		}
		Element.prototype.removeChild = optimize(Element.prototype.removeChild);
    `);
}