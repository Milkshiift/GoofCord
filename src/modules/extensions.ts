import * as fs from "graceful-fs";
import {app, session} from "electron";
import * as electron from "electron";

export async function loadExtensions() {
    const userDataPath = app.getPath("userData");
    const extensionsFolder = userDataPath + "/extensions/";
    if (!fs.existsSync(extensionsFolder)) {
        await fs.promises.mkdir(extensionsFolder);
        console.log("Created missing extensions folder");
    }
    for (const file of (await fs.promises.readdir(extensionsFolder))) {
        try {
            const manifest = await fs.promises.readFile(`${userDataPath}/extensions/${file}/manifest.json`, "utf8");
            const extensionFile = JSON.parse(manifest);
            await session.defaultSession.loadExtension(`${userDataPath}/extensions/${file}`);
            console.log(`[Mod loader] Loaded ${extensionFile.name} made by ${extensionFile.author}`);
        } catch (err) {
            console.error(err);
        }
    }
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