import {addScript} from "../utils";
import {log} from "../modules/logger";
import {ipcRenderer} from "electron";
import {getConfig} from "../config";

export async function loadScripts() {
    if (getConfig("scriptLoading") === false) return;

    const scripts: string[][] = await ipcRenderer.invoke("getScripts");
    for (const script of scripts) {
        addScript(script[1]);
        log(`Loaded "${script[0]}" script`);
    }
}
