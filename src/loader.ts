import {installDefaultScripts} from "./scriptLoader/scriptPreparer";
import {createMainWindow} from "./window";
import {loadExtensions, updateModBundle} from "./modules/extensions";
import {checkForUpdate} from "./modules/updateCheck";

export async function load() {
    await loadExtensions()
    await createMainWindow();

    void installDefaultScripts();
    void updateModBundle();
    void checkForUpdate();
}
