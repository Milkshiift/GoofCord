import {mainWindow} from "../window";
import {session} from "electron";
import {getConfig} from "../utils";

export async function initializeFirewall() {

    // Blocking URLs. This list works in tandem with "blockedStrings" list.
    session.defaultSession.webRequest.onBeforeRequest(
        {
            urls: await getConfig("blocklist")
        },
        (_, callback) => callback({cancel: true})
    );

    /* If request url includes any of those, it is blocked.
        * By doing so, we can match multiple unwanted URLs, making the blocklist cleaner and more efficient */
    const blockedStrings = [
        "sentry",
        "google",
        "log",
        "tracking",
        "stats",
        "spotify", // Turns out spotify embeds don't need xhr requests to function
        "pagead"
    ];
    const blockRegex = new RegExp(blockedStrings.join("|"), "i"); // 'i' flag for case-insensitive matching

    const allowedStrings = [
        "googlevideo", // For YouTube playback
        "discord-attachments",
        "login", // For discord login
        "googleapis" // For discord activities
    ];
    const allowRegex = new RegExp(allowedStrings.join("|"), "i");

    session.defaultSession.webRequest.onBeforeSendHeaders({urls: ["<all_urls>"]}, (details, callback) => {
        if (details.resourceType != "xhr") { // Filtering out non-xhr requests for performance
            callback({cancel: false});
            return;
        }

        if (blockRegex.test(details.url) && !allowRegex.test(details.url)) {
            callback({cancel: true});
        } else {
            callback({
                cancel: false,
                requestHeaders: {
                    ...details.requestHeaders,
                    "User-Agent": mainWindow.webContents.userAgent
                }
            });
        }
    });
}