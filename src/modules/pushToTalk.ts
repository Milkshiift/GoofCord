export function initPushToTalk() {
    const keybinds = JSON.parse(window.localStorage.getItem("keybinds")!);
    const PTTKeybinds = findSubobjectWithValue(keybinds, "action", "PUSH_TO_TALK");
    if (!PTTKeybinds) return;

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

    // https://www.npmjs.com/package/node-global-key-listener works only in X11 on Linux, in my testing doesn't work in X11 either
}

function findSubobjectWithValue(mainObj: object | null, objKey: string, value: string) {
    if (!mainObj) return null;
    for (const key in mainObj) {
        if (mainObj[key][objKey] === value) {
            return mainObj[key];
        }
    }
    return null;
}
