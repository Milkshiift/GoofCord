// RENDERER
import {ipcRenderer} from "electron";

interface IPCSources {
    id: string;
    name: string;
    thumbnail: HTMLCanvasElement;
}

function createSourceItem({ id, name, thumbnail }: IPCSources): HTMLLIElement {
    const li = document.createElement("li");
    li.classList.add("desktop-capturer-selection__item");

    const button = document.createElement("button");
    button.classList.add("desktop-capturer-selection__btn");
    button.dataset.id = id;
    button.title = name;

    const img = document.createElement("img");
    img.classList.add("desktop-capturer-selection__thumbnail");
    img.src = thumbnail.toDataURL();
    img.alt = name;

    const span = document.createElement("span");
    span.classList.add("desktop-capturer-selection__name");
    span.textContent = name;

    button.appendChild(img);
    button.appendChild(span);
    li.appendChild(button);

    return li;
}

function selectSource(id: string | null, title: string | null) {
    try {
        const audio = document.getElementById("audio-checkbox") as HTMLInputElement;
        const resolution = document.getElementById("resolution-textbox") as HTMLInputElement;
        const framerate = document.getElementById("framerate-textbox") as HTMLInputElement;
        if (ipcRenderer.sendSync("isVencordPresent") || (resolution.value === "720" && framerate.value === "30")) {
            ipcRenderer.send("flashTitlebar", "#5865F2");
        }
        else {
            ipcRenderer.send("flashTitlebarWithText", "#f8312f", "Custom resolution & framerate are only available with Vencord");
        }

        ipcRenderer.send("selectScreenshareSource", id, title, audio.checked, resolution.value, framerate.value);
    } catch (err) {
        console.error(err);
    }
}

async function addDisplays() {
    ipcRenderer.once("getSources", (_event, arg) => {
        const sources: IPCSources[] = arg;
        console.log(sources);

        const closeButton = document.createElement("button");
        closeButton.classList.add("closeButton");
        closeButton.addEventListener("click", () => {
            ipcRenderer.send("selectScreenshareSource", "window:000000:0", "Close", false, true);
        });

        const selectionElem = document.createElement("div");
        selectionElem.classList.add("desktop-capturer-selection");
        selectionElem.innerHTML = `
            <h1 style="margin-bottom: 0">Screen Share</h1>
            <div class="desktop-capturer-selection__scroller">
              <ul class="desktop-capturer-selection__list">
                ${sources.map(createSourceItem).map(li => li.outerHTML).join("")}
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
            </div>
        `;

        document.body.innerHTML = "";
        document.body.appendChild(closeButton);
        document.body.appendChild(selectionElem);

        // Attach event listeners after elements are added to the DOM
        document.querySelectorAll(".desktop-capturer-selection__btn").forEach(button => {
            button.addEventListener("click", () => selectSource(button.getAttribute("data-id"), button.getAttribute("title")));
        });
    });
}

addDisplays();