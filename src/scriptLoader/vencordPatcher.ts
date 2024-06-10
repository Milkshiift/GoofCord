import {getConfig} from "../config";
import {getDisplayVersion} from "../utils";
import {enabledScripts} from "./scriptPreparer";
import chalk from "chalk";

export async function patchVencord(bundle: string) {
    console.log(chalk.yellow("[Mod Loader]"), "Patching Vencord");
    console.time(chalk.green("[Timer]") + " Patching Vencord took");
    // For patches in custom scripts to work, we inject them into Vencord's code
    bundle = await patchVencordWithScriptPatches(bundle);
    // Patch Vencord to show the GoofCord category in settings
    bundle = await patchString(bundle, /makeSettingsCategories\((.)\){return\[/, `
        $&
        {
            section: $1.HEADER,
            label: "GoofCord",
            className: "gf-settings-header"
        },
        {
            section: "GoofCordSettings",
            label: "Settings",
            onClick: ()=>{
                window.goofcord.openSettingsWindow();
            },
            className: "gf-settings"
        },
        {
            section: $1.DIVIDER
        },
    `);
    // Patch Vencord to show GoofCord version in settings
    bundle = await patchString(bundle, /additionalInfo:.{24}(.+?")/, `$&GoofCord ${getDisplayVersion()}"),$1`);
    console.timeEnd(chalk.green("[Timer]") + " Patching Vencord took");
    return bundle;
}

async function patchVencordWithScriptPatches(bundle: string) {
    if (getConfig("scriptLoading") === false) return bundle;

    const patches = getPatchesFromScripts();

    const patch = "$1"+patches;
    bundle = await patchString(bundle, /(\("PluginManager","#a6d189"\),.+?)\[]/m, patch);

    return bundle;
}

export async function patchString(bundle: string, searchable: string | RegExp, patch: string) {
    return bundle.replace(searchable, patch);
}

function getPatchesFromScripts() {
    const regex = /const.patches.=.(\[.+?]);/s;

    const allPatches = enabledScripts
        .map((script) => {
            const patchesMatch = script[1].match(regex);
            return patchesMatch ? patchesMatch[1] // If a patch exists
                .replaceAll("$", "$$$$") // Duplicating all dollar signs so they don't cause problems when using .replace in patching https://developer.mozilla.org/en-US/docs/web/javascript/reference/global_objects/string/replace#specifying_a_function_as_the_replacement
                .slice(1, -1) + "," : ""; // Removing [ and ] symbols and adding a comma to account for multiple patches
        })
        .join("");

    return "[" + allPatches + "]";
}
