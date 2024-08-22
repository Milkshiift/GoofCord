import { getConfig } from "../config";
import { addScript } from "../utils";

export async function addDefaultPlugins() {
	if (!getConfig("modNames").includes("shelter") || !getConfig("installDefaultShelterPlugins")) return;
	addScript(`(async()=>{
        while(!window.shelter?.plugins?.addRemotePlugin) await new Promise(resolve => setTimeout(resolve, 500));
        const defaultPlugins = [
            ["https://yellowsink.github.io/shelter-plugins/crisp-img/", true],
            ["https://spikehd.github.io/shelter-plugins/plugin-browser/", false],
            ["https://spikehd.github.io/shelter-plugins/shelteRPC/", true],
            ["https://milkshiift.github.io/goofcord-shelter-plugins/dynamic-icon/", true],
            ["https://milkshiift.github.io/goofcord-shelter-plugins/screenshare-quality/", true],
            ["https://milkshiift.github.io/goofcord-shelter-plugins/console-suppressor/", true],
            ["https://milkshiift.github.io/goofcord-shelter-plugins/message-encryption/", true],
            ["https://milkshiift.github.io/goofcord-shelter-plugins/invidious-embeds/", true],
            ["https://milkshiift.github.io/goofcord-shelter-plugins/settings-category/", true]
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
    })()`);
}
