import type { Patch } from "@vencord/types/utils/types";
import { ipcRenderer } from "electron";

// This whole file is messed up

let patchesScript = `
(() => {
if (!window.Vencord.Plugins.patches) return;
window.GCDP = {};
`;

interface PatchData {
    patches: Omit<Patch, "plugin">[];
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    [key: string]: any;
}

export function addPatch(p: PatchData) {
    const { patches, ...globals } = p;

    patches.map((patch)=>{
        if (!Array.isArray(patch.replacement)) patch.replacement = [patch.replacement];
        for (const r of patch.replacement) {
            if (typeof r.replace === "string") r.replace = r.replace.replaceAll("$self", "GCDP");
            if (typeof r.match !== "string") { // @ts-ignore
                r.match = [r.match.source, r.match.flags];
            }
        }
        // @ts-ignore
        patch.plugin = "GoofCord";
        return patch;
    })

    patchesScript += `
    window.Vencord.Plugins.patches.push(...${JSON.stringify(patches)}.map((patch)=>{
        for (const r of patch.replacement) {
            if (Array.isArray(r.match)) {
                r.match = new RegExp(r.match[0], r.match[1]);
            }
        }
        return patch;
    }));
    `;

    for (const globalF in globals) {
        patchesScript += `\nwindow.GCDP.${globalF}=function ${String(globals[globalF])}`;
    }
}

export const scripts: string[][] = [];

export function getDefaultScripts() {
    scripts.push(["notificationFix", `
        (() => {
        const originalSetter = Object.getOwnPropertyDescriptor(Notification.prototype, "onclick").set;
        Object.defineProperty(Notification.prototype, "onclick", {
            set(onClick) {
            originalSetter.call(this, function() {
                onClick.apply(this, arguments);
                goofcord.window.show();
            })
            },
            configurable: true
        });
        })();
    `]);

    scripts.unshift(["vencordPatches", patchesScript+"})();"]);

    if (ipcRenderer.sendSync("config:getConfig", "domOptimizer")) {
        scripts.push(["domOptimizer", `
            function optimize(orig) {
                const delayedClasses = ["activity", "gif", "avatar", "imagePlaceholder", "reaction", "hoverBar"];
            
                return function (...args) {
                    const element = args[0];
                    //console.log(element);
            
                    if (typeof element?.className === "string") {
                        if (delayedClasses.some(partial => element.className.includes(partial))) {
                            //console.log("DELAYED", element.className);
                            setTimeout(() => orig.apply(this, args), 100 - Math.random() * 50);
                            return;
                        }
                    }
                    return orig.apply(this, args);
                };
            }
            Element.prototype.removeChild = optimize(Element.prototype.removeChild);
        `]);
    }

    if (ipcRenderer.sendSync("config:getConfig", "modNames").includes("shelter") && ipcRenderer.sendSync("config:getConfig", "installDefaultShelterPlugins")) {
        scripts.push(["shelterPluginInit", `
            (async()=>{
                while(!window.shelter?.plugins?.addRemotePlugin) await new Promise(resolve => setTimeout(resolve, 1000));
                const defaultPlugins = [
                    ["https://spikehd.github.io/shelter-plugins/plugin-browser/", false],
                    ["https://spikehd.github.io/shelter-plugins/shelteRPC/", true],
                    ["https://milkshiift.github.io/goofcord-shelter-plugins/dynamic-icon/", true],
                    ["https://milkshiift.github.io/goofcord-shelter-plugins/console-suppressor/", false],
                    ["https://milkshiift.github.io/goofcord-shelter-plugins/message-encryption/", true],
                    ["https://milkshiift.github.io/goofcord-shelter-plugins/invidious-embeds/", true],
                    ["https://milkshiift.github.io/goofcord-shelter-plugins/settings-category/", true],
                    ["https://milkshiift.github.io/goofcord-shelter-plugins/webpack-magic/", true],
                ];
                for (const plugin of defaultPlugins) {
                    try {
                        await window.shelter.plugins.addRemotePlugin(getId(plugin[0]), plugin[0]);
                        if (plugin[1]) await window.shelter.plugins.startPlugin(getId(plugin[0]));
                    } catch (e) {}
                }
                console.log("Added default Shelter plugins");
                function getId(url) {
                    return url.replace("https://", "");
                }
            })()
        `]);
    }

    return scripts;
}