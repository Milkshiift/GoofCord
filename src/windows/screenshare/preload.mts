import { ipcRenderer } from "electron";

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

async function selectSource(id: string | null, title: string | null) {
	try {
		const audio = (document.getElementById("audio-checkbox") as HTMLInputElement).checked;
		const contentHint = (document.getElementById("content-hint-select") as HTMLInputElement).value;
		const resolution = (document.getElementById("resolution-textbox") as HTMLInputElement).value;
		const framerate = (document.getElementById("framerate-textbox") as HTMLInputElement).value;
		void ipcRenderer.invoke("flashTitlebar", "#5865F2");

		void ipcRenderer.invoke("config:setConfig", "screensharePreviousSettings", [+resolution, +framerate, audio, contentHint]);

		void ipcRenderer.invoke("selectScreenshareSource", id, title, audio, contentHint, resolution, framerate);
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
			ipcRenderer.invoke("selectScreenshareSource", "window:000000:0", "Close", false, true);
		});

		const previousSettings = ipcRenderer.sendSync("config:getConfig", "screensharePreviousSettings");

		const selectionElem = document.createElement("div");
		selectionElem.classList.add("desktop-capturer-selection");
		selectionElem.innerHTML = `
            <h1 style="margin-bottom: 0">${ipcRenderer.sendSync("localization:i", "screenshare-screenshare")}</h1>
            <div class="desktop-capturer-selection__scroller">
              <ul class="desktop-capturer-selection__list">
                ${sources
									.map(createSourceItem)
									.map((li) => li.outerHTML)
									.join("")}
              </ul>
            </div>
            <div class="checkbox-container">
              <div class="subcontainer">
                <input id="audio-checkbox" type="checkbox" ${previousSettings[2] ? "checked" : ""} />
                <label for="audio-checkbox">${ipcRenderer.sendSync("localization:i", "screenshare-audio")}</label>
              </div>
              <div class="subcontainer">
                <select id="content-hint-select">
                  <option value="motion" ${previousSettings[3] !== "detail" ? "selected" : ""}>${ipcRenderer.sendSync("localization:i", "screenshare-optimization-motion")}</option>
                  <option value="detail" ${previousSettings[3] === "detail" ? "selected" : ""}>${ipcRenderer.sendSync("localization:i", "screenshare-optimization-detail")}</option>
                </select>
                <label for="audio-checkbox">${ipcRenderer.sendSync("localization:i", "screenshare-optimization")}</label>
              </div>
              <div class="subcontainer">
                <input id="resolution-textbox" type="text" value="${previousSettings[0]}" />
                <label for="resolution-textbox">${ipcRenderer.sendSync("localization:i", "screenshare-resolution")}</label>
              </div>
              <div class="subcontainer">
                <input id="framerate-textbox" type="text" value="${previousSettings[1]}"/>
                <label for="framerate-textbox">${ipcRenderer.sendSync("localization:i", "screenshare-framerate")}</label>
              </div>
            </div>
        `;

		document.body.appendChild(closeButton);
		document.body.appendChild(selectionElem);

		// Attach event listeners after elements are added to the DOM
		for (const button of document.querySelectorAll(".desktop-capturer-selection__btn")) {
			button.addEventListener("click", () => selectSource(button.getAttribute("data-id"), button.getAttribute("title")));
		}
	});
}

void addDisplays();

document.addEventListener("keydown", (key) => {
	if (key.code === "Escape") {
		void ipcRenderer.invoke("selectScreenshareSource");
	} else if (key.code === "Enter") {
		void selectSource("0", "Screen");
	}
});
