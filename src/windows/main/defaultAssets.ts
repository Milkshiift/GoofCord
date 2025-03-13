import { ipcRenderer } from "electron";

// TODO: Improve this some way, string coding is not fun
export function getDefaultScripts() {
    const scripts: string[][] = [
        ["screensharePatch", `
            (() => {
            window.patchStreamQuality = (opts) => {
                const screenshareQuality = window.screenshareSettings;
                if (!screenshareQuality) return;
                
                const framerate = Number(screenshareQuality.framerate);
                const height = Number(screenshareQuality.resolution);
                const width = Math.round(height * (screen.width / screen.height));
    
                Object.assign(opts, {
                    bitrateMin: 500000,
                    bitrateMax: 8000000,
                    bitrateTarget: 600000
                });
                if (opts?.encode) {
                    Object.assign(opts.encode, {
                        framerate,
                        width,
                        height,
                        pixelCount: height * width
                    });
                }
                Object.assign(opts.capture, {
                    framerate,
                    width,
                    height,
                    pixelCount: height * width
                });
            }
            
            if (window.Vencord.Plugins.patches) {
                window.Vencord.Plugins.patches.push({
                    plugin: "GoofCord",
                    find: "this.localWant=",
                    replacement: [{
                        match: /this.localWant=/,
                        replace: "window.patchStreamQuality(this);$&"
                    }]
                });
            }
            
            const original = navigator.mediaDevices.getDisplayMedia;
            
            async function getVirtmic() {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const audioDevice = devices.find(({ label }) => label === "vencord-screen-share");
                    return audioDevice?.deviceId;
                } catch (error) {
                    return null;
                }
            }
            
            navigator.mediaDevices.getDisplayMedia = async function (opts) {
                const stream = await original.call(this, opts);
                console.log("Setting stream's content hint and audio device");
                
                const settings = window.screenshareSettings;
                settings.width = Math.round(settings.resolution * (screen.width / screen.height));
                
                const videoTrack = stream.getVideoTracks()[0];
                videoTrack.contentHint = settings.contentHint || "motion";
                
                const constraints = {
                    ...videoTrack.getConstraints(),
                    frameRate: { min: settings.framerate, ideal: settings.framerate },
                    width: { min: 640, ideal: settings.width, max: settings.width },
                    height: { min: 480, ideal: settings.resolution, max: settings.resolution },
                    advanced: [{ width: settings.width, height: settings.resolution }],
                    resizeMode: "none"
                };
    
                videoTrack.applyConstraints(constraints).then(() => {
                    console.log("Applied constraints successfully. New constraints: ", videoTrack.getConstraints());
                }).catch(e => console.error("Failed to apply constraints.", e));
                
                // Default audio sharing
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) audioTrack.contentHint = "music";
                
                // Venmic
                const id = await getVirtmic();
                if (id) {
                    const audio = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            deviceId: {
                                exact: id
                            },
                            autoGainControl: false,
                            echoCancellation: false,
                            noiseSuppression: false
                        }
                    });
                    audio.getAudioTracks().forEach(t => stream.addTrack(t));
                }
        
                return stream;
            };
            
            setTimeout(() => {
                window.shelter.flux.dispatcher.subscribe("STREAM_CLOSE", ({streamKey}) => {
                    const owner = streamKey.split(":").at(-1);
                    if (owner === shelter.flux.stores.UserStore.getCurrentUser().id) {
                        goofcord.stopVenmic();
                    }
                })
            }, 5000); // Time for shelter flux to initialize
            })();
        `],
        ["notificationFix", `
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
        `]
    ];

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