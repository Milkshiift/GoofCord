import {BrowserWindow} from "electron";
import {getConfig, setConfig} from "../config";

type NumberPair = [number, number];
type WindowState = [boolean, NumberPair, NumberPair];

export function adjustWindow(window: BrowserWindow, windowName: string, defaults: WindowState) {
    let previousWindowState = getConfig(`windowState:${windowName}`) as WindowState | undefined;
    if (!previousWindowState) {
        previousWindowState = defaults;
        setConfig("windowState:"+windowName, defaults);
    }

    const [osMaximized, [x,y], [width, height]] = previousWindowState;
    window.setPosition(x, y);
    window.setSize(width, height);
    if (osMaximized) window.maximize();

    window.on('close', async (_) => {
        const isMaximized = window.isMaximized();
        let position: NumberPair, size: NumberPair;
        if (isMaximized) {
            position = previousWindowState[1];
            size = previousWindowState[2];
        } else {
            position = window.getPosition() as NumberPair;
            size = window.getSize() as NumberPair;
        }

        const windowState: WindowState = [isMaximized, position, size];
        await setConfig(`windowState:${windowName}`, windowState);
    });
}
