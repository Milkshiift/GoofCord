import path from "path";
import {ipcRenderer} from "electron";
import fs from "fs";
import {addScript} from "../utils";
import {error, log} from "./logger";

export function loadScripts() {
    const scriptsPath = path.join(ipcRenderer.sendSync("get-user-data-path"), "/scripts/");

    fs.readdirSync(scriptsPath).forEach((file) => {
        try {
            const scriptContent = fs.readFileSync(path.join(scriptsPath, file), "utf8");
            addScript(scriptContent);

            const scriptInfo = parseScriptInfo(scriptContent);
            if (scriptInfo.name === "") {
                log(`Loaded ${file} script. Version: ${scriptInfo.version}`);
            }
            else {
                log(`Loaded "${scriptInfo.name}" script. Version: ${scriptInfo.version}`);
            }
        } catch (err) {
            error("An error occurred during script loading: " + err);
        }
    });
}

// I suspect there is a better way to parse the information
function parseScriptInfo(scriptContent: string) {
    const infoRegex = /\/\*\*\s*\n([\s\S]*?)\n\s*\*\//;
    const matches = scriptContent.match(infoRegex);
    const scriptInfo = { name: "", description: "", version: "" };

    if (matches && matches[1]) {
        const infoString = matches[1];
        const infoLines = infoString.split("\n");

        infoLines.forEach((line) => {
            const match = line.match(/^\s*\*\s*@(\w+)\s+(.*)/);
            if (match) {
                const [, key, value] = match;
                if (key === "name") {
                    scriptInfo.name = value.trim();
                } else if (key === "description") {
                    scriptInfo.description = value.trim();
                } else if (key === "version") {
                    scriptInfo.version = value.trim();
                }
            }
        });
    }

    return scriptInfo;
}