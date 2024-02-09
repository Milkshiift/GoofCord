import {categorizeScripts, installDefaultScripts} from "./scriptLoader/scriptPreparer";
import {unstrictCSP} from "./modules/firewall";
import {createMainWindow} from "./window";
import {getConfig} from "./config/config";
import {installModLoader, loadExtensions} from "./modules/extensions";
import {checkForUpdate} from "./modules/updateCheck";
import "./tray";
import {checkIfFoldersExist} from "./config/configChecker";

async function load() {
    await checkIfFoldersExist();
    categorizeScripts();
    installDefaultScripts();
    unstrictCSP();

    if ((getConfig("modName")) != "none") await loadExtensions();

    await createMainWindow();

    if ((getConfig("modName")) != "none") installModLoader();

    if (getConfig("updateNotification")) checkForUpdate();
}
load();