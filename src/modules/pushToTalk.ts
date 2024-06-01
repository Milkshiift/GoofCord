export function initPushToTalk() {
    const keybinds = window.localStorage.getItem("keybinds");
    const PTTKeybinds = findSubobjectWithValue(keybinds, "action", "PUSH_TO_TALK");

    let control = false;
    let shift = false;
    let keyCode = 0;
    for (const shortcut of PTTKeybinds.shortcut) {
        // This assumes that if there are 3 items in PTTKeybinds.shortcut then one of them is Ctrl, one of them is Shift, and the other one is the key
        // Not the greatest, but it probably won't break
        if (shortcut[1] === 16) {
            shift = true;
        } else if (shortcut[1] === 17) {
            control = true;
        } else {
            keyCode = shortcut[1];
        }
    }

    // We need to somehow listen to global keydown and keyup events, which is very problematic in nodejs
    // https://www.npmjs.com/package/iohook or https://www.npmjs.com/package/uiohook-napi don't provide prebuilds for the latest electron and nodejs versions
    // https://www.npmjs.com/package/node-global-key-listener works only in X11 on Linux
    // Electron's globalShortcut doesn't allow to listen for individual keydown and keyup events
}

function findSubobjectWithValue(mainObj, objKey, value) {
    for (let key in mainObj) {
        if (mainObj[key][objKey] === value) {
            return mainObj[key];
        }
    }
    return null;
}
