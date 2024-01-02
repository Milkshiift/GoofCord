import {ipcRenderer} from "electron";
import {log} from "../modules/logger";

interface IPCSources {
    id: string;
    name: string;
    thumbnail: HTMLCanvasElement;
}

async function addDisplays() {
    ipcRenderer.once("getSources", (event, arg) => {
        const sources: IPCSources[] = arg;
        console.log(sources);
        document.body.innerHTML = "<button class='closeIcon' title='Cancel'></button>";
        const selectionElem = document.createElement("div");
        //@ts-ignore
        selectionElem.classList = ["desktop-capturer-selection"];
        selectionElem.innerHTML = `
<h1 style="margin-bottom: 0">Screen Share</h1>
<div class="desktop-capturer-selection__scroller">
    <ul class="desktop-capturer-selection__list">
      ${sources
        .map(
            ({id, name, thumbnail}) => `
        <li class="desktop-capturer-selection__item">
          <button class="desktop-capturer-selection__btn" data-id="${id}" title="${name}">
            <img class="desktop-capturer-selection__thumbnail" src="${thumbnail.toDataURL()}"  alt="${name}"/>
            <span class="desktop-capturer-selection__name">${name}</span>
          </button>
        </li>
      `
        )
        .join("")}
    </ul>
    </div>
    <div class="checkbox-container">
        <div class="subcontainer">
            <input id="resolution-textbox" type="text" value="720" />
            <label for="resolution-textbox">Resolution</label>
        </div>
        <div class="subcontainer">
            <input id="audio-checkbox" type="checkbox" />
            <label for="audio-checkbox">Stream audio</label>
        </div>
        <div class="subcontainer">
            <input id="framerate-textbox" type="text" value="30"/>
            <label for="framerate-textbox">Framerate</label>
        </div>
    </div>`;
        document.body.appendChild(selectionElem);
        document.querySelectorAll(".desktop-capturer-selection__btn").forEach((button) => {
            button.addEventListener("click", async () => {
                try {
                    const id = button.getAttribute("data-id");
                    const title = button.getAttribute("title");
                    const audio = document.getElementById("audio-checkbox") as HTMLInputElement;
                    const resolution = document.getElementById("resolution-textbox") as HTMLInputElement;
                    const framerate = document.getElementById("framerate-textbox") as HTMLInputElement;

                    // @ts-ignore
                    if (await ipcRenderer.invoke("isVencordPresent") || (resolution.value === "720" && framerate.value === "30")) {
                        ipcRenderer.send("flashTitlebar", "#5865F2");
                    }
                    else {
                        ipcRenderer.send("flashTitlebarWithText", "#f8312f", "Custom resolution & framerate are only available with Vencord");
                    }

                    ipcRenderer.send("selectScreenshareSource", id, title, audio.checked, resolution.value, framerate.value);
                } catch (err) {
                    console.error(err);
                }
            });
        });
        document.querySelectorAll(".closeIcon")[0].addEventListener("click", () => {
            ipcRenderer.send("selectScreenshareSource", "window:000000:0", "Close", false, true);
        });
    });
}

addDisplays();
