// RENDERER
import "./bridge";
import * as path from "path";
import {addScript, addStyle} from "../utils";
import {injectTitlebar} from "./titlebar";
import fs from "fs";
import {initPushToTalk} from "../modules/pushToTalk";
import {addDefaultPlugins} from "./shelter";
import {loadScripts} from "../modules/scriptLoader";

document.addEventListener("DOMContentLoaded", async () => {
    void loadScripts();
    void injectTitlebar();
    void addDefaultPlugins();

    // Hide "Download Discord Desktop now!" banner
    window.localStorage.setItem("hideNag", "true");

    // dirty hack to make clicking notifications focus GoofCord
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

    initPushToTalk();

    addStyle(await fs.promises.readFile(path.join(__dirname, "../", "/assets/css/discord.css"), "utf8"));
});
