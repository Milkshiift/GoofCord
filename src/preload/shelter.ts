import {getConfig} from "../config";
import {addScript} from "../utils";

export async function addDefaultPlugins() {
    if (!getConfig("modNames").includes("shelter")) return;
    addScript(`(async()=>{
        while(!window.shelter?.plugins?.addRemotePlugin) await new Promise(resolve => setTimeout(resolve, 500));
        const defaultPlugins = [
            "https://yellowsink.github.io/shelter-plugins/crisp-img/",
            "https://yellowsink.github.io/shelter-plugins/no-devtools-detect",
            "https://spikehd.github.io/shelter-plugins/plugin-browser/",
            "https://spikehd.github.io/shelter-plugins/shelteRPC/",
            "https://milkshiift.github.io/goofcord-shelter-plugins/dynamic-icon/",
            "https://milkshiift.github.io/goofcord-shelter-plugins/screenshare-quality/",
            "https://milkshiift.github.io/goofcord-shelter-plugins/console-suppressor/",
            "https://milkshiift.github.io/goofcord-shelter-plugins/message-encryption/",
            "https://milkshiift.github.io/goofcord-shelter-plugins/invidious-embeds/"
        ];
        //const ids = defaultPlugins.map(getId);
        for (const pluginUrl of defaultPlugins) {
            try {
                await window.shelter.plugins.addRemotePlugin(getId(pluginUrl), pluginUrl);
                await window.shelter.plugins.startPlugin(getId(pluginUrl));
            } catch (e) {}
        }
        console.log("Added default Shelter plugins");
        function getId(url) {
            return url.replace("https://", "");
        }
    })()`);
}
