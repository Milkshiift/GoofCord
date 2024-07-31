async function loadResource(url, type) {
    try {
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
    } catch (e) {
    }
}

loadResource(chrome.runtime.getURL("dist/bundle.js"), 'script');
loadResource(chrome.runtime.getURL("dist/bundle.css"), 'style');
