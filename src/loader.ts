import {createMainWindow} from "./window";
import {loadExtensions, updateMods} from "./modules/extensions";
import {checkForUpdate} from "./modules/updateCheck";

export async function load() {
    await loadExtensions();
    await createMainWindow();

    void updateMods();
    void checkForUpdate();
}
