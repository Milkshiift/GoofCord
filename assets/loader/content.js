async function loadResource(url, type) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
            const element = document.createElement(type === 'script' ? 'script' : 'link');
            if (type === 'script') {
                element.src = url;
                document.documentElement.appendChild(element);
            } else if (type === 'style') {
                element.type = "text/css";
                element.rel = "stylesheet";
                element.href = url;
                document.addEventListener(
                    "DOMContentLoaded",
                    () => document.documentElement.appendChild(element),
                    { once: true }
                );
            }
        } else {
            console.warn(`${url} not found`);
        }
    } catch (e) {
        console.error(`Error loading ${url}:`, e);
    }
}

const scriptUrl = chrome.runtime.getURL("dist/bundle.js");
const styleUrl = chrome.runtime.getURL("dist/bundle.css");

loadResource(scriptUrl, 'script');
loadResource(styleUrl, 'style');
