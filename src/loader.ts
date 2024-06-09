import {categorizeScripts, installDefaultScripts} from "./scriptLoader/scriptPreparer";
import {unstrictCSP} from "./modules/firewall";
import {createMainWindow} from "./window";
import {loadExtensions, updateModBundle} from "./modules/extensions";
import {checkForUpdate} from "./modules/updateCheck";
import {initEncryption} from "./modules/messageEncryption";
import {registerIpc} from "./ipc";

export async function load() {
    void initEncryption();
    await Promise.all([
        unstrictCSP(),
        loadExtensions(),
        categorizeScripts(),
        registerIpc()
    ]);

    await createMainWindow();

    void installDefaultScripts();
    void updateModBundle();
    void checkForUpdate();
}
