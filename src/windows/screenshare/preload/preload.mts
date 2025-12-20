import { ipcRenderer } from "electron";
import { invoke, sendSync } from "../../../ipc/client.ts";

interface IPCSource {
	id: string;
	name: string;
	thumbnail: { toDataURL(): string };
}

interface ScreenshareSettings {
	resolution: number;
	framerate: number;
	audio: boolean;
	contentHint: "motion" | "detail";
}

const DISPLAY_MODES = {
	Quality: {
		"480p": 480,
		"720p": 720,
		"1080p": 1080,
		"1440p": 1440,
		Source: 2160,
	},
	Framerate: {
		"15fps": 15,
		"30fps": 30,
		"60fps": 60,
	},
} as const;

const DEFAULT_SETTINGS: ScreenshareSettings = {
	resolution: 1080,
	framerate: 30,
	audio: false,
	contentHint: "motion",
};

function escapeHtml(text: string): string {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

function i(key: string): string {
	return sendSync("localization:i", key) as string;
}

function generateOptionsHtml(options: Record<string, number>, selectedValue: number): string {
	return Object.entries(options)
		.map(([label, value]) => `<option value="${value}"${value === selectedValue ? " selected" : ""}>${label}</option>`)
		.join("");
}

function createSourceItemHtml({ id, name, thumbnail }: IPCSource): string {
	const escapedName = escapeHtml(name);
	const escapedId = escapeHtml(id);
	return `
    <li class="desktop-capturer-selection__item">
      <button class="desktop-capturer-selection__btn" data-id="${escapedId}" title="${escapedName}">
        <div class="desktop-capturer-selection__thumbnail-container">
          <img class="desktop-capturer-selection__thumbnail" src="${thumbnail.toDataURL()}" alt="${escapedName}">
        </div>
        <span class="desktop-capturer-selection__name">${escapedName}</span>
      </button>
    </li>
  `;
}

function getFormSettings(): ScreenshareSettings | null {
	const audioCheckbox = document.getElementById("audio-checkbox") as HTMLInputElement | null;
	const contentHintSelect = document.getElementById("content-hint-select") as HTMLSelectElement | null;
	const resolutionSelect = document.getElementById("resolution-select") as HTMLSelectElement | null;
	const framerateSelect = document.getElementById("framerate-select") as HTMLSelectElement | null;

	if (!audioCheckbox || !contentHintSelect || !resolutionSelect || !framerateSelect) {
		console.error("[getFormSettings] Required form elements not found");
		return null;
	}

	return {
		audio: audioCheckbox.checked,
		contentHint: contentHintSelect.value as "motion" | "detail",
		resolution: Number(resolutionSelect.value),
		framerate: Number(framerateSelect.value),
	};
}

function parseStoredSettings(raw: unknown): ScreenshareSettings {
	if (!Array.isArray(raw) || raw.length < 4) {
		return DEFAULT_SETTINGS;
	}

	return {
		resolution: typeof raw[0] === "number" ? raw[0] : DEFAULT_SETTINGS.resolution,
		framerate: typeof raw[1] === "number" ? raw[1] : DEFAULT_SETTINGS.framerate,
		audio: typeof raw[2] === "boolean" ? raw[2] : DEFAULT_SETTINGS.audio,
		contentHint: raw[3] === "detail" ? "detail" : "motion",
	};
}

async function selectSource(id: string | null, title: string | null): Promise<void> {
	const settings = getFormSettings();
	if (!settings) {
		return;
	}

	try {
		void invoke("flashTitlebar", "#5865F2");
		void invoke("config:setConfig", "screensharePreviousSettings", [settings.resolution, settings.framerate, settings.audio, settings.contentHint]);

		void ipcRenderer.invoke("selectScreenshareSource", id ?? "", title ?? "", settings.audio, settings.contentHint, settings.resolution, settings.framerate);
	} catch (err) {
		console.error("[selectSource] An error occurred:", err);
	}
}

function addDisplays(): void {
	ipcRenderer.once("getSources", (_event, sources: IPCSource[]) => {
		try {
			const previousSettingsRaw = sendSync("config:getConfig", "screensharePreviousSettings");
			const previousSettings = parseStoredSettings(previousSettingsRaw);

			const closeButton = document.createElement("button");
			closeButton.classList.add("closeButton");
			closeButton.addEventListener("click", () => {
				void ipcRenderer.invoke("selectScreenshareSource");
			});

			const selectionElem = document.createElement("div");
			selectionElem.classList.add("desktop-capturer-selection");
			selectionElem.innerHTML = `
				<h1 style="margin-bottom: 0">${escapeHtml(i("screenshare-screenshare"))}</h1>
				<div class="desktop-capturer-selection__scroller">
				  <ul class="desktop-capturer-selection__list">
					${sources.map(createSourceItemHtml).join("")}
				  </ul>
				</div>
				<div class="checkbox-container">
				  <div class="subcontainer">
					<input id="audio-checkbox" type="checkbox" ${previousSettings.audio ? "checked" : ""} />
					<label for="audio-checkbox">${escapeHtml(i("screenshare-audio"))}</label>
				  </div>
				  <div class="subcontainer">
					<select id="content-hint-select">
					  <option value="motion" ${previousSettings.contentHint !== "detail" ? "selected" : ""}>${escapeHtml(i("screenshare-optimization-motion"))}</option>
					  <option value="detail" ${previousSettings.contentHint === "detail" ? "selected" : ""}>${escapeHtml(i("screenshare-optimization-detail"))}</option>
					</select>
					<label for="content-hint-select">${escapeHtml(i("screenshare-optimization"))}</label>
				  </div>
				  <div class="subcontainer">
					<select id="resolution-select">${generateOptionsHtml(DISPLAY_MODES.Quality, previousSettings.resolution)}</select>
					<label for="resolution-select">${escapeHtml(i("screenshare-resolution"))}</label>
				  </div>
				  <div class="subcontainer">
					<select id="framerate-select">${generateOptionsHtml(DISPLAY_MODES.Framerate, previousSettings.framerate)}</select>
					<label for="framerate-select">${escapeHtml(i("screenshare-framerate"))}</label>
				  </div>
				</div>
			`;

			document.body.appendChild(closeButton);
			document.body.appendChild(selectionElem);

			selectionElem.addEventListener("click", (event) => {
				const button = (event.target as HTMLElement).closest(".desktop-capturer-selection__btn");
				if (button instanceof HTMLElement) {
					void selectSource(button.dataset.id ?? null, button.title ?? null);
				}
			});
		} catch (err) {
			console.error("[addDisplays] An error occurred:", err);
		}
	});
}

addDisplays();

document.addEventListener("keydown", (event) => {
	if (event.code === "Escape") {
		void ipcRenderer.invoke("selectScreenshareSource");
	} else if (event.code === "Enter") {
		void selectSource("0", "Screen");
	}
});
