(async()=>{
    while(!window.shelter?.plugins?.addRemotePlugin) await new Promise(resolve => setTimeout(resolve, 1000));
    const defaultPlugins = [
        ["https://spikehd.github.io/shelter-plugins/plugin-browser/", false],
        ["https://spikehd.github.io/shelter-plugins/shelteRPC/", true],
        ["https://milkshiift.github.io/goofcord-shelter-plugins/dynamic-icon/", true],
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