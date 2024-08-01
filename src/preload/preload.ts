// RENDERER
import "./bridge";
import * as path from "path";
import {addScript, addStyle} from "../utils";
import {injectTitlebar} from "./titlebar";
import fs from "fs/promises";
import {initPushToTalk} from "../modules/pushToTalk";
import {addDefaultPlugins} from "./shelter";
import {getConfig} from "../config";
import {ipcRenderer} from "electron";
import {log} from "../modules/logger";

document.addEventListener("DOMContentLoaded", async () => {
    if (!document.location.hostname.includes("discord")) return;

    const original = navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia = async function (opts) {
        const stream = await original.call(this, opts);
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack.contentHint = "motion";
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.contentHint = "music";

        return stream;
    };

    void loadScripts();
    void injectTitlebar();
    void addDefaultPlugins();
    fixScreenShare();
    fixNotifications();
    initPushToTalk();

    // Hide "Download Discord Desktop now!" banner
    window.localStorage.setItem("hideNag", "true");

    addStyle(await fs.readFile(path.join(__dirname, "../", "/assets/css/discord.css"), "utf8"));
});

async function loadScripts() {
    if (getConfig("scriptLoading")) {
        const scripts: string[][] = await ipcRenderer.invoke("getScripts");
        for (const script of scripts) {
            addScript(script[1]);
            log(`Loaded "${script[0]}" script`);
        }
    }
}

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
