import {categorizeScripts, installDefaultScripts} from "./scriptLoader/scriptPreparer";
import {unstrictCSP} from "./modules/firewall";
import {createMainWindow} from "./window";
import {loadExtensions, updateModBundle} from "./modules/extensions";
import {checkForUpdate} from "./modules/updateCheck";
import {createTray} from "./tray";
import {initEncryption} from "./modules/messageEncryption";

async function load() {
    installDefaultScripts();
    unstrictCSP();
    createTray();
    loadExtensions();
    categorizeScripts();
    initEncryption();

    await createMainWindow();

    updateModBundle();
    checkForUpdate();
}
load();