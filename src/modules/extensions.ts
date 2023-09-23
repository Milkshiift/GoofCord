import * as fs from "graceful-fs";
import {app, session} from "electron";
import * as electron from "electron";

export function loadExtensions() {
    const userDataPath = app.getPath("userData");
    const extensionsFolder = userDataPath + "/extensions/";
    if (!fs.existsSync(extensionsFolder)) {
        fs.mkdirSync(extensionsFolder);
        console.log("Created missing extensions folder");
    }
    fs.readdirSync(extensionsFolder).forEach((file) => {
        try {
            const manifest = fs.readFileSync(`${userDataPath}/extensions/${file}/manifest.json`, "utf8");
            const extensionFile = JSON.parse(manifest);
            session.defaultSession.loadExtension(`${userDataPath}/extensions/${file}`);
            console.log(`[Mod loader] Loaded ${extensionFile.name} made by ${extensionFile.author}`);
        } catch (err) {
            console.error(err);
        }
    });
}

export const unstrictCSP = () => {
    console.log("Setting up CSP unstricter...");

    electron.session.defaultSession.webRequest.onHeadersReceived(({responseHeaders, resourceType}, done) => {
        if (!responseHeaders) return done({});

        if (resourceType === "mainFrame") {
            delete responseHeaders["content-security-policy"];
        } else if (resourceType === "stylesheet") {
            // Fix hosts that don't properly set the css content type, such as
            // raw.githubusercontent.com
            responseHeaders["content-type"] = ["text/css"];
        }
        done({responseHeaders});
    });
};