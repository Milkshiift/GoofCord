if (typeof browser === "undefined") {
    var browser = chrome;
}
try {
const script = document.createElement("script");
script.src = browser.runtime.getURL("dist/bundle.js");
// documentElement because we load before body/head are ready
document.documentElement.appendChild(script);
const style = document.createElement("link");
style.type = "text/css";
style.rel = "stylesheet";
style.href = browser.runtime.getURL("dist/bundle.css");

document.documentElement.append(script);

document.addEventListener(
    "DOMContentLoaded",
    () => document.documentElement.append(style),
    { once: true }
);
} catch(e){console.error(e)}
