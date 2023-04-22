import * as fs from "fs";
import {app, session} from "electron";

/*app.whenReady().then(() => {
    /*setTimeout(() => {
        fs.readdirSync(pluginFolder).forEach((file) => {
            try {
                const manifest = fs.readFileSync(`${userDataPath}/plugins/${file}/manifest.json`, "utf8");
                const pluginFile = JSON.parse(manifest);
                session.defaultSession.loadExtension(`${userDataPath}/plugins/${file}`);
                console.log(`[Mod loader] Loaded ${pluginFile.name} made by ${pluginFile.author}`);
                //mainWindow.reload(); // For some reason Vencord only loads after manual restart, so this is a dirty fix for that
            } catch (err) {
                console.error(err);
            }
        });
    }, 2000)
});*/

export function loadMods() {
    const userDataPath = app.getPath("userData");
    const pluginFolder = userDataPath + "/plugins/";
    if (!fs.existsSync(pluginFolder)) {
        fs.mkdirSync(pluginFolder);
        console.log("Created missing plugin folder");
    }
    fs.readdirSync(pluginFolder).forEach((file) => {
        try {
            const manifest = fs.readFileSync(`${userDataPath}/plugins/${file}/manifest.json`, "utf8");
            const pluginFile = JSON.parse(manifest);
            session.defaultSession.loadExtension(`${userDataPath}/plugins/${file}`);
            console.log(`[Mod loader] Loaded ${pluginFile.name} made by ${pluginFile.author}`);
        } catch (err) {
            console.error(err);
        }
    });
}
