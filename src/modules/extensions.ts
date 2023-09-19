import * as fs from "fs";
import {app, session} from "electron";

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
