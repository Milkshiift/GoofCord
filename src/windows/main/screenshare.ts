import { addPatch, scripts } from "./defaultAssets.ts";

addPatch({
    patches: [
        {
            find: "this.localWant=",
            replacement: {
                match: /this.localWant=/,
                replace: "$self.patchStreamQuality(this);$&"
            }
        }
    ],
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    patchStreamQuality(opts: any) {
        // @ts-ignore
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
});

scripts.push(["screensharePatch", `
    (() => {
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
                    noiseSuppression: false,
                    channelCount: 2,
                    sampleRate: 48000,
                    sampleSize: 16
                }
            });
            
            stream.getAudioTracks().forEach(t => stream.removeTrack(t));
            stream.addTrack(audio.getAudioTracks()[0]);
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
`]);