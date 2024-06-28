import {installDefaultScripts} from "./scriptLoader/scriptPreparer";
import {createMainWindow} from "./window";
import {loadExtensions, updateMods} from "./modules/extensions";
import {checkForUpdate} from "./modules/updateCheck";

export async function load() {
    await loadExtensions();
    await createMainWindow();

    void installDefaultScripts();
    void updateMods();
    void checkForUpdate();
}
