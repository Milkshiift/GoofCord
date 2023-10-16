import {afterLoadScripts, beforeLoadScripts} from "./scriptLoader";

export async function patchVencord(bundle: string) {
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
    const combinedScripts = beforeLoadScripts.concat(afterLoadScripts);
    const regex = /const\s+patches\s+=\s+(\[[\s\S]+?]);/;

    let allPatches = combinedScripts
        .map(([, scriptContent]) => {
            const patchesMatch = scriptContent.match(regex);
            return patchesMatch ? patchesMatch[1].replace(/\s+/g, "").slice(1, -1) + "," : "";
        })
        .join("");

    allPatches = allPatches.substring(0, allPatches.length - 1);
    return "[" + allPatches + "]";
}