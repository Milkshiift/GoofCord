import { invoke } from "@root/src/ipc/client.preload.ts";
import { getConfig } from "@root/src/stores/config/config.preload.ts";
import { i } from "@root/src/stores/localization/localization.preload.ts";
import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { type ButtonEntry, type ConfigKey, type SettingEntry, settingsSchema } from "../../../settingsSchema.ts";
import { isEncryptionAvailable } from "./config.ts";
import { SettingField } from "./SettingField.tsx";

type CategoryName = keyof typeof settingsSchema;
const categories = Object.keys(settingsSchema) as CategoryName[];

const toId = (name: string) => `panel-${name.toLowerCase().replace(/\s+/g, "-")}`;

const STORAGE_KEY = "tabSwitcherState";
const STATE_RETENTION_MS = 15_000;

function getInitialTab(): number {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const { id, timestamp } = JSON.parse(saved);
			if (Date.now() - timestamp < STATE_RETENTION_MS) {
				const idx = categories.findIndex((c) => toId(c) === id);
				if (idx !== -1) return idx;
			}
		}
	} catch {}
	return 0;
}

export function App(): JSX.Element {
	const [activeTab, setActiveTab] = useState(getInitialTab);
	const [revealedPanels, setRevealedPanels] = useState<Set<number>>(() => new Set());

	const easterEgg = useEasterEgg(categories.length);

	const handleTabClick = (index: number, e: MouseEvent) => {
		const tripleClick = easterEgg.handleClick(index, e);
		if (tripleClick) {
			setRevealedPanels((prev) => new Set(prev).add(index));
		}
		setActiveTab(index);

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: toId(categories[index]), timestamp: Date.now() }));
		} catch {}
	};

	useEffect(() => {
		if (getConfig("disableSettingsAnimations")) {
			document.body.classList.add("disable-animations");
		}
	}, []);

	return (
		<div class="settings-page-container">
			<header class="settings-header">
				<nav class="settings-tabs" aria-label="Settings Categories">
					{categories.map((name, idx) => (
						<button type="button" key={name} class={`tab-item${idx === activeTab ? " active" : ""}`} role="tab" aria-selected={idx === activeTab} aria-controls={toId(name)} onClick={(e) => handleTabClick(idx, e)}>
							{i(`category-${name.toLowerCase().split(" ")[0]}`)}
						</button>
					))}
				</nav>
			</header>

			{!isEncryptionAvailable() && (
				<div class="message warning">
					<p>{i("settings-encryption-unavailable")}</p>
				</div>
			)}

			<div class="settings-content">
				{categories.map((name, idx) => (
					<SettingsPanel key={name} name={name} active={idx === activeTab} revealed={revealedPanels.has(idx)} />
				))}
			</div>
		</div>
	);
}

const buttonClickActions = {
	loadCloud: () => invoke("cloud:loadCloud"),
	deleteCloud: () => invoke("cloud:deleteCloud"),
	saveCloud: () => invoke("cloud:saveCloud"),
	openFolder: (folder: string) => invoke("settings:openFolder", folder),
	clearCache: () => invoke("cacheManager:clearCache"),
} as const;
export type ButtonActionMap = typeof buttonClickActions;
export type ActionKey = keyof ButtonActionMap;

interface SettingsPanelProps {
	name: CategoryName;
	active: boolean;
	revealed: boolean;
}

function SettingsPanel({ name, active, revealed }: SettingsPanelProps): JSX.Element {
	const category = settingsSchema[name];
	const entries = Object.entries(category) as [string, SettingEntry | ButtonEntry][];

	const settings = entries.filter(([key]) => !key.startsWith("button-"));
	const buttons = entries.filter(([key]) => key.startsWith("button-"));

	return (
		<div id={toId(name)} class={`content-panel${active ? " active" : ""}`} role="tabpanel">
			<form class="settingsContainer">
				{settings.map(([key, entry]) => (
					<SettingField key={key} settingKey={key as ConfigKey} entry={entry as SettingEntry} forceVisible={revealed} />
				))}

				{buttons.length > 0 && (
					<div class="buttonContainer">
						{buttons.map(([key, entry]) => (
							<button
								key={key}
								type="button"
								onClick={() => {
									const [fnName, ...args] = (entry as ButtonEntry).action;
									const actionFn = buttonClickActions[fnName as ActionKey];
									// @ts-expect-error This is safe
									actionFn(...args);
								}}
							>
								{i(`opt-${key}`)}
							</button>
						))}
					</div>
				)}
			</form>
		</div>
	);
}

function useEasterEgg(tabCount: number) {
	const clickState = useRef({ count: 0, time: 0, tabIndex: -1 });
	const secretProgress = useRef<number[]>([]);

	const secretTarget = useMemo(() => {
		if (tabCount < 3) return [];
		const seq: number[] = [];
		for (let l = 0, r = tabCount - 1; l <= r; l++, r--) {
			seq.push(l);
			if (l !== r) seq.push(r);
		}
		return seq;
	}, [tabCount]);

	const showConfetti = useCallback((x: number, y: number, emoji: string, count: number) => {
		const fragment = document.createDocumentFragment();
		for (let j = 0; j < count; j++) {
			const el = document.createElement("div");
			el.textContent = emoji;
			const angle = Math.random() * Math.PI * 2;
			const distance = 50 + Math.random() * 100;
			const duration = 800 + Math.random() * 600;

			el.style.cssText = `
				position:fixed;left:${x}px;top:${y}px;
				font-size:${10 + Math.random() * 15}px;
				pointer-events:none;z-index:9999;will-change:transform,opacity;
			`;

			el.animate(
				[
					{ transform: "translate(0,0)", opacity: 1 },
					{ transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px)`, opacity: 0 },
				],
				{ duration, easing: "cubic-bezier(0.25,0.46,0.45,0.94)" },
			).onfinish = () => el.remove();

			fragment.appendChild(el);
		}
		document.body.appendChild(fragment);
	}, []);

	const triggerSecretAnimation = useCallback(() => {
		const tabs = document.querySelectorAll(".tab-item");
		tabs.forEach((tab, j) => {
			setTimeout(() => {
				const rect = tab.getBoundingClientRect();
				showConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, "🎉", 15);
			}, j * 150);
		});

		const letters = ["🇬", "🇴", "🇴", "🇫", "🇨", "🇴", "🇷", "🇩"];
		const startDelay = tabs.length * 150;
		letters.forEach((letter, j) => {
			setTimeout(
				() => {
					const x = window.innerWidth * (0.25 + Math.random() * 0.5);
					const y = window.innerHeight * (0.25 + Math.random() * 0.5);
					showConfetti(x, y, letter, 10);
				},
				startDelay + j * 250,
			);
		});
	}, [showConfetti]);

	const handleClick = useCallback(
		(tabIndex: number, e: MouseEvent): boolean => {
			const now = Date.now();
			const state = clickState.current;
			const isSame = tabIndex === state.tabIndex;
			const isQuick = now - state.time <= 300;

			state.count = isSame && isQuick ? state.count + 1 : 1;
			state.time = now;
			state.tabIndex = tabIndex;

			// Check secret sequence on single clicks
			if (state.count === 1) {
				secretProgress.current.push(tabIndex);
				if (secretProgress.current.length > secretTarget.length) {
					secretProgress.current.shift();
				}

				if (secretProgress.current.length === secretTarget.length && secretProgress.current.every((v, j) => v === secretTarget[j])) {
					triggerSecretAnimation();
					secretProgress.current = [];
				}
			}

			// Triple click reveals hidden settings
			if (state.count === 3) {
				const target = e.currentTarget as HTMLElement;
				const rect = target.getBoundingClientRect();
				showConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, "👁️", 25);
				state.count = 0;
				return true;
			}

			return false;
		},
		[secretTarget, showConfetti, triggerSecretAnimation],
	);

	return { handleClick };
}
