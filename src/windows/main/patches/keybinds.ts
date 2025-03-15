import { addPatch, scripts } from "../defaultAssets.ts";

scripts.push(["keybinds", `
window.GCDP.keybindCallbacks = {};

window.GCDP.triggerKeybind = function triggerKeybind(id, keyup) {
    var cb = window.GCDP.keybindCallbacks[id];
    if (cb.keyEvents.keyup && keyup) {
        cb.onTrigger(false);
    } else if (cb.keyEvents.keydown && !keyup) {
        cb.onTrigger(true);
    }
}
`]);

addPatch({
    patches: [
        {
            find: "keybindActionTypes",
            replacement: [
                {
                    match: /((?:[A-Za-z_$][\w$]*)\.isPlatformEmbedded\?)(.+renderEmpty\((?:[A-Za-z_$][\w$]*)\)\]\}\)\]\}\))/,
                    replace: "$1$self.xdpWarning($2)"
                },
                {
                    match: /(?:[A-Za-z_$][\w$]*)\.isPlatformEmbedded/g,
                    replace: "true"
                },
                {
                    match: /\(0,(?:[A-Za-z_$][\w$]*)\.isDesktop\)\(\)/g,
                    replace: "true"
                },
                {
                    match: /\.keybindGroup,(?:[A-Za-z_$][\w$]*).card\),children:\[/g,
                    replace: "$&`ID: ${this.props.keybind.id}`,"
                }
            ]
        },
        {
            find: "[kb store] KeybindStore",
            replacement: [
                {
                    match: /let{keybinds:((?:[A-Za-z_$][\w$]*))}=(?:[A-Za-z_$][\w$]*);/,
                    replace: "$&$self.preRegisterKeybinds($1);"
                }
            ]
        }
    ],
    preRegisterKeybinds (allActions: {
        [action: string]: {
            onTrigger;
            keyEvents: {
                keyup: boolean;
                keydown: boolean;
            };
        };
    }) {
        if (!window.goofcord.keybind.shouldPreRegister()) {
            return;
        }
        let id = 1;
        for (const [key, val] of Object.entries(allActions)) {
            if (
                [
                    "UNASSIGNED",
                    "SWITCH_TO_VOICE_CHANNEL",
                    "TOGGLE_OVERLAY",
                    "TOGGLE_OVERLAY_INPUT_LOCK",
                    "TOGGLE_PRIORITY_SPEAKER",
                    "OVERLAY_ACTIVATE_REGION_TEXT_WIDGET",
                    "TOGGLE_GO_LIVE_STREAMING",
                    "SOUNDBOARD",
                    "SOUNDBOARD_HOLD",
                    "SAVE_CLIP"
                ].includes(key)
            ) {
                continue;
            }
            window.GCDP.keybindCallbacks[id] = {
                onTrigger: (keyState: boolean) =>
                    val.onTrigger(keyState, {
                        // switch to channel also requires some extra properties that would have to be supplied here
                        context: undefined
                    }),
                keyEvents: val.keyEvents
            };
            id++;
        }
    },
    xdpWarning(keybinds) {
        if (!window.goofcord.keybind.shouldPreRegister()) {
            return keybinds;
        }
        window.goofcord.keybind.preRegister([
                { id: 1, name: 'Push To Talk' },
                { id: 2, name: 'Push To Talk (Priority)' },
                { id: 3, name: 'Push To Mute' },
                { id: 4, name: 'Toggle Mute' },
                { id: 5, name: 'Toggle Deafen' },
                { id: 6, name: 'TOGGLE_CAMERA' },
                { id: 7, name: 'Toggle Voice Activity Mode' },
                { id: 8, name: 'Toggle Streamer Mode' },
                { id: 9, name: 'Navigate Back' },
                { id: 10, name: 'Navigate Forward' },
                { id: 11, name: 'Disconnect From Voice Channel' }
        ]);

        return true;
    }
});