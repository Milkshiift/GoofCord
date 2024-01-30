// This file contains everything that uses session.defaultSession.webRequest
import {mainWindow} from "../window";
import {session} from "electron";
import electron from "electron";
import {getConfig} from "../config/config";

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
        "tracking",
        "stats",
        "\\.spotify", // Turns out spotify embeds don't need xhr requests to function
        "pagead",
        "analytics"
    ];
    const blockRegex = new RegExp(blockedStrings.join("|"), "i"); // 'i' flag for case-insensitive matching

    const allowedStrings = [
        "googlevideo", // For YouTube playback
        "discord-attachments",
        "googleapis", // For discord activities
        "search",
        "api.spotify"
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

export function unstrictCSP() {
    console.log("Setting up CSP unstricter...");

    electron.session.defaultSession.webRequest.onHeadersReceived(({responseHeaders, resourceType}, done) => {
        if (!responseHeaders) return done({});

        if (resourceType === "mainFrame") {
            // This behaves very strangely. For some, everything works without deleting CSP,
            // for some "CSP" works, for some "csp"
            delete responseHeaders["Content-Security-Policy"];
            delete responseHeaders["content-security-policy"];
        } else if (resourceType === "stylesheet") {
            // Fix hosts that don't properly set the css content type, such as
            // raw.githubusercontent.com
            responseHeaders["content-type"] = ["text/css"];
        }
        done({responseHeaders});
    });
}