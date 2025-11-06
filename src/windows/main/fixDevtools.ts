import { addPatch } from "./defaultScripts.ts";

addPatch({
    patches: [
        // Unblock DevTools shortcut on mac
        {
            find: '"mod+alt+i"',
            replacement: {
                match: /"discord\.com"===location\.host/,
                replace: "false"
            }
        },
        {
            find: ".setDevtoolsCallbacks(",
            group: true,
            replacement: [
                {
                    match: /if\(null!=(?:[A-Za-z_$][\w$]*)&&"0.0.0"===(?:[A-Za-z_$][\w$]*)\.remoteApp\.getVersion\(\)\)/,
                    replace: "if(true)"
                }
            ]
        }
    ]
});