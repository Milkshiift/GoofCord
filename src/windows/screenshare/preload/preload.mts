import { getConfig, setConfig, whenConfigReady, getDefaultValue } from "@root/src/stores/config/config.preload.ts";
import { i, whenLocalizationReady } from "@root/src/stores/localization/localization.preload.ts";
import { ipcRenderer } from "electron";
import type { ShareableNode } from "patchcord";

import { invoke } from "../../../ipc/client.preload.ts";

interface IPCSource {
	id: string;
	name: string;
	thumbnail: string;
}

interface AudioConfig {
	mode: "none" | "system" | "app";
	pids: number[];
}

export interface ScreenshareSettings {
	resolution: number;
	framerate: number;
	audioConfig: AudioConfig;
	contentHint: "motion" | "detail";
}

interface ScreensharePayload {
	sources: IPCSource[] | null;
	audioNodes: ShareableNode[];
	isPatchcord: boolean;
}

const DISPLAY_MODES = {
	Quality: { "480p": 480, "720p": 720, "1080p": 1080, "1440p": 1440, Source: 2160 },
	Framerate: { "15fps": 15, "30fps": 30, "60fps": 60 },
} as const;

// Minimalist, accessible icons for Segmented Controls
const CONTROL_ICONS: Record<string, string> = {
	motion: `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
	detail: `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
	none: `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>`,
	system: `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
	app: `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>`,
};

let isPatchcordMode = false;
let isRefreshing = false;

const escapeMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (text: string) => String(text ?? "").replace(/[&<>"']/g, (m) => escapeMap[m]);

const $ = <T extends HTMLElement>(id: string): T => {
	const el = document.getElementById(id);
	if (!el) throw new Error(`[Screenshare] Strict DOM Contract Failed: Missing '#${id}'`);
	return el as T;
};

// Generates accessible Segmented Control HTML with optional tasteful icons
function generateSegmentedControlHtml(name: string, options: Record<string, string | number>, selectedValue: string | number): string {
	return Object.entries(options)
		.map(
			([label, value]) => `
			<label class="segmented-control__item">
				<input type="radio" name="${escapeHtml(name)}" value="${value}" ${value === selectedValue ? "checked" : ""}>
				<span>
					${CONTROL_ICONS[value as string] || ""}
					${escapeHtml(label)}
				</span>
			</label>
		`,
		)
		.join("");
}

function createSourceItemHtml({ id, name, thumbnail }: IPCSource): string {
	const escapedName = escapeHtml(name === "unknown" ? i("screenshare-unknown-source") : name);
	return `
		<li class="desktop-capturer-selection__item">
			<button class="desktop-capturer-selection__btn" data-id="${escapeHtml(id)}" title="${escapedName}">
				<div class="desktop-capturer-selection__thumbnail-container">
					<img class="desktop-capturer-selection__thumbnail" src="${thumbnail}" alt="${escapedName}">
				</div>
				<span class="desktop-capturer-selection__name">${escapedName}</span>
			</button>
		</li>
	`;
}

function renderAudioApps(audioNodes: ShareableNode[], previousPids: number[]): string {
	const uniqueApps = new Map<number, ShareableNode>();
	for (const node of audioNodes) {
		if (node.processId) uniqueApps.set(node.processId, node);
	}

	if (uniqueApps.size === 0) {
		return `<div class="audio-apps-empty" style="grid-column: 1 / -1;">${escapeHtml(i("screenshare-audio-empty"))}</div>`;
	}

	return Array.from(uniqueApps.values())
		.sort((a, b) => a.displayName.localeCompare(b.displayName))
		.map(
			(app) => `
			<label class="audio-app-item">
				<input type="checkbox" value="${app.processId}" ${previousPids.includes(app.processId!) ? "checked" : ""}>
				<span class="audio-app-name">${escapeHtml(app.displayName)}</span>
			</label>
		`,
		)
		.join("");
}

function getFormSettings(): ScreenshareSettings | null {
	const contentHint = document.querySelector<HTMLInputElement>('input[name="contentHint"]:checked')?.value as "motion" | "detail";
	const resolution = Number(document.querySelector<HTMLInputElement>('input[name="resolution"]:checked')?.value);
	const framerate = Number(document.querySelector<HTMLInputElement>('input[name="framerate"]:checked')?.value);

	if (!contentHint || isNaN(resolution) || isNaN(framerate)) return null;

	let audioConfig: AudioConfig = { mode: "none", pids: [] };

	if (isPatchcordMode) {
		audioConfig.mode = (document.querySelector<HTMLInputElement>('input[name="audioMode"]:checked')?.value as AudioConfig["mode"]) ?? "none";
		audioConfig.pids = Array.from(document.querySelectorAll<HTMLInputElement>("#audio-apps-list input:checked")).map((el) => Number(el.value));
	} else if ($<HTMLInputElement>("audio-share-checkbox").checked) {
		audioConfig.mode = "system";
	}

	return { audioConfig, contentHint, resolution, framerate };
}

async function selectSource(id: string | null, title: string | null): Promise<void> {
	const settings = getFormSettings();
	if (!settings) return;

	try {
		await invoke("flashTitlebar", "#5865F2");
		await setConfig("screensharePreviousSettings", settings);
		await ipcRenderer.invoke("selectScreenshareSource", id ?? "", title ?? "", settings.audioConfig, settings.contentHint, settings.resolution, settings.framerate);
	} catch (err) {
		console.error("[selectSource] IPC error:", err);
	}
}

async function refreshData() {
	if (isRefreshing) return;
	isRefreshing = true;

	const btn = $("refresh-btn");
	btn.classList.add("spinning");

	try {
		const { sources, audioNodes } = (await ipcRenderer.invoke("refreshScreenshareSources")) as ScreensharePayload;

		if (sources) {
			$("sources-list").innerHTML = sources.map(createSourceItemHtml).join("");
		}

		if (isPatchcordMode) {
			const selectedPids = Array.from(document.querySelectorAll<HTMLInputElement>("#audio-apps-list input:checked")).map((el) => Number(el.value));
			$("audio-apps-list").innerHTML = renderAudioApps(audioNodes, selectedPids);
		}
	} catch (err) {
		console.error("[Screenshare] Failed to refresh sources:", err);
	} finally {
		btn.classList.remove("spinning");
		isRefreshing = false;
	}
}

async function init() {
	await Promise.all([whenLocalizationReady(), whenConfigReady()]);

	const storedSettings = getConfig("screensharePreviousSettings") as ScreenshareSettings;
	const s = !storedSettings || Array.isArray(storedSettings) ? (getDefaultValue("screensharePreviousSettings") as ScreenshareSettings) : storedSettings;
	s.audioConfig ??= { mode: "none", pids: [] };

	const payload = (await ipcRenderer.invoke("refreshScreenshareSources")) as ScreensharePayload;
	isPatchcordMode = payload.isPatchcord;

	$("title-text").textContent = i("screenshare-screenshare");
	$("subtitle-text").textContent = i("screenshare-subtitle");
	$("refresh-btn").title = i("screenshare-refresh");
	$("stream-settings-title").textContent = i("screenshare-stream-settings");
	$("hint-label").textContent = i("screenshare-optimization");
	$("resolution-label").textContent = i("screenshare-resolution");
	$("framerate-label").textContent = i("screenshare-framerate");

	const contentHintOpts = {
		[i("screenshare-optimization-motion")]: "motion",
		[i("screenshare-optimization-detail")]: "detail",
	};
	$("content-hint-group").innerHTML = generateSegmentedControlHtml("contentHint", contentHintOpts, s.contentHint);
	$("resolution-group").innerHTML = generateSegmentedControlHtml("resolution", DISPLAY_MODES.Quality, s.resolution);
	$("framerate-group").innerHTML = generateSegmentedControlHtml("framerate", DISPLAY_MODES.Framerate, s.framerate);

	if (isPatchcordMode) {
		$("linux-audio-section").style.display = "block";
		$("linux-audio-title").textContent = i("screenshare-audio-linux-title");
		$("audio-mode-label").textContent = i("screenshare-audio-mode-label");

		const audioModeOpts = {
			[i("screenshare-audio-none")]: "none",
			[i("screenshare-audio-system")]: "system",
			[i("screenshare-audio-app")]: "app",
		};

		const modeGroup = $("audio-mode-group");
		modeGroup.innerHTML = generateSegmentedControlHtml("audioMode", audioModeOpts, s.audioConfig.mode);

		const appsContainer = $("audio-apps-container");
		const appsLabel = $("audio-apps-label");
		const appsDesc = $("audio-apps-desc");

		let previousMode = s.audioConfig.mode;

		const updateAppListVisibility = () => {
			const currentMode = document.querySelector<HTMLInputElement>('input[name="audioMode"]:checked')?.value || "none";
			const isNone = currentMode === "none";
			appsContainer.style.display = isNone ? "none" : "flex";

			if (!isNone) {
				const isSystem = currentMode === "system";
				appsLabel.textContent = i(isSystem ? "screenshare-audio-excluded" : "screenshare-audio-included");
				appsDesc.textContent = i(isSystem ? "screenshare-audio-mute-desc" : "screenshare-audio-hear-desc");
			}
		};

		modeGroup.addEventListener("change", (e) => {
			const target = e.target as HTMLInputElement;
			if (target.name === "audioMode") {
				const val = target.value as typeof s.audioConfig.mode;
				if (val !== "none" && previousMode !== "none" && val !== previousMode) {
					appsContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
				}
				previousMode = val;
				updateAppListVisibility();
			}
		});

		updateAppListVisibility();
		$("audio-apps-list").innerHTML = renderAudioApps(payload.audioNodes, s.audioConfig.pids);
	} else {
		$("standard-audio-section").style.display = "block";
		$("audio-toggle-label").textContent = i("screenshare-audio-capture");
		$("audio-toggle-desc").textContent = i("screenshare-audio-capture-desc");
		$<HTMLInputElement>("audio-share-checkbox").checked = s.audioConfig.mode !== "none";
	}

	if (payload.sources) {
		$("sources-list").innerHTML = payload.sources.map(createSourceItemHtml).join("");
	}

	$("refresh-btn").addEventListener("click", () => void refreshData());

	await ipcRenderer.invoke("showScreenshareWindow");
	document.querySelector<HTMLElement>(".desktop-capturer-selection__btn")?.focus();
}

window.addEventListener("DOMContentLoaded", () => void init());

document.addEventListener("click", (event) => {
	const button = (event.target as HTMLElement).closest(".desktop-capturer-selection__btn");
	if (button instanceof HTMLElement) {
		void selectSource(button.dataset.id ?? null, button.title ?? null);
	}
});

document.addEventListener("keydown", (event) => {
	if (event.code === "Escape") {
		void ipcRenderer.invoke("selectScreenshareSource");
	}
});
