import {scriptCategories} from "./scriptPreparer";
import {getConfig} from "../config/config";

// For patches in custom scripts to work, we inject them into Vencord's code

export async function patchVencord(bundle: string) {
    if (await getConfig("scriptLoading") === false) return bundle;

    console.log("[Mod loader] Patching Vencord");

    const patches = getPatchesFromScripts();

    const match = bundle.match(/patches:([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    const retrievedVarName = match ? match[1] : null;

    if (retrievedVarName) {
        const patch = `
            function addObjectsIfNotExists(arr, objs) {
                objs.forEach(obj => {
                    if (!arr.some(item => JSON.stringify(item) === JSON.stringify(obj))) {
                        arr.push(obj);
                    }
                });
            }
            addObjectsIfNotExists(${retrievedVarName}, ${patches});
        `;

        const searchable = "Vencord.Plugins;";
        const index = bundle.indexOf(searchable) + searchable.length;
        bundle = bundle.substring(0, index) + patch + bundle.substring(index);
    } else {
        console.error("An error occurred during Vencord patching");
    }

    return bundle;
}

function getPatchesFromScripts() {
    const regex = /const\s+patches\s+=\s+(\[[\s\S]+?]);/;

    let allPatches = scriptCategories.scriptsCombined
        .map((scriptContent) => {
            const patchesMatch = scriptContent.match(regex);
            return patchesMatch ? patchesMatch[1].replace(/(".*?")|\s+/g, (_match, capture) => {
                // If the match is inside double quotes, return it unchanged
                if (capture) {
                    return capture;
                }
                return "";
            }).slice(1, -1) + "," : "";
        })
        .join("");

    allPatches = allPatches.substring(0, allPatches.length - 1);
    return "[" + allPatches + "]";
}