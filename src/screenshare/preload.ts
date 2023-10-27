import {ipcRenderer} from "electron";

interface IPCSources {
    id: string;
    name: string;
    thumbnail: HTMLCanvasElement;
}

async function addDisplays() {
    ipcRenderer.once("getSources", (event, arg) => {
        const sources: IPCSources[] = arg;
        console.log(sources);
        const selectionElem = document.createElement("div");
        //@ts-ignore
        selectionElem.classList = ["desktop-capturer-selection"];
        selectionElem.innerHTML = `
<h1 style="margin-bottom: 0">Screen Share</h1>
<button class="closeIcon" title="Cancel">
    <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="#73777c" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z"></path>
    </svg>
</button>
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
        <input id="audio-checkbox" type="checkbox" />
        <label for="audio-checkbox">Stream audio</label>
    </div>`;
        document.body.appendChild(selectionElem);
        document.querySelectorAll(".desktop-capturer-selection__btn").forEach((button) => {
            button.addEventListener("click", async () => {
                try {
                    const id = button.getAttribute("data-id");
                    const title = button.getAttribute("title");
                    const audio = document.getElementById("audio-checkbox") as HTMLInputElement;

                    ipcRenderer.send("selectScreenshareSource", id, title, audio.checked);
                    ipcRenderer.send("flashTitlebar", "#5865F2");
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
