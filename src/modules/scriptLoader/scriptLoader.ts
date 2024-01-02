import {addScript, getConfig} from "../../utils";
import {log} from "../logger";
import {ipcRenderer} from "electron";

// Function to load scripts from the specified array (either BL or AL). Runs from the renderer process (preload.ts)
export async function loadScripts(scriptType: boolean) {
    if (await getConfig("scriptLoading") === false) return;

    const { afterLoadScripts, beforeLoadScripts } = await ipcRenderer.invoke("getScriptCategories");
    const scriptsToLoad = scriptType ? afterLoadScripts : beforeLoadScripts;

    for (const [scriptName, scriptContent, scriptInfo] of scriptsToLoad) {
        addScript(scriptContent);

        if (scriptInfo.name === "") {
            log(`Loaded ${scriptName} script. Version: Unknown`);
        } else {
            log(`Loaded "${scriptInfo.name}" script. Version: ${scriptInfo.version}`);
        }
    }
}