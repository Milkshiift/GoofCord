import { getConfig } from "@root/src/config.ts";
import { BrowserWindow } from "electron";

/*
    The levels of hacking here are crazy.
    The grand goal is to create a window with Monaco Editor and send/receive CSS from the main window.
    Communication is the problem.

    Traditionally to communicate between windows you would need to pass messages like this:
    Renderer 1 -> Preload 1 -> Main -> Preload 2 -> Renderer 2
    It is as horrible as it sounds.

    So instead we can use the BroadcastChannel API. It can directly communicate between two renderer processes, *but only if* they are in the same origin.
    For that we load the popout URL of Discord. It's essentially an empty page.
    After that we inject JS to set everything up and communicate.

    Can't wait for this to break.
 */

export async function createQuickCssWindow<IPCHandle>() {
	const quickCssWindow = new BrowserWindow({
		title: "QuickCSS",
		show: true,
		darkTheme: true,
		autoHideMenuBar: true,
	});

	await quickCssWindow.loadURL(getConfig("discordUrl").replace("/app", "/popout"));

	await quickCssWindow.webContents.executeJavaScript(`
        document.title = "QuickCSS";
        document.body.innerHTML = '<div id="monaco" style="position: absolute;left: 0;top: 0;width: 100%;height: 100%;margin: 0;padding: 0;overflow: hidden;"></div>';

        const loaderScript = document.createElement('script');
        loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/loader.js';
        
        loaderScript.onload = () => {
            require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' } });

            require(['vs/editor/editor.main'], function() {
                const container = document.getElementById('monaco');
                const channel = new BroadcastChannel("quickcss");
                let editor;

                function initEditor(initialValue) {
                    if (editor) return;

                    editor = monaco.editor.create(container, {
                        value: initialValue || "",
                        language: "css",
                        theme: "vs-dark",
                        automaticLayout: true,
                        minimap: { enabled: false },
                        fontSize: 14
                    });

                    editor.onDidChangeModelContent(() => {
                        channel.postMessage(editor.getValue());
                    });
                }

                channel.onmessage = (event) => {
                    if (editor) {
                        if (event.data !== editor.getValue()) {
                            editor.setValue(event.data);
                        }
                    } else if (event.data !== "get") {
                        initEditor(event.data);
                    }
                };

                channel.postMessage("get");
                
                setTimeout(() => {
                    if (!editor) document.body.innerHTML = "Failed to connect to the main window";
                }, 1000);
            });
        };

        document.body.appendChild(loaderScript);
    `);
}
