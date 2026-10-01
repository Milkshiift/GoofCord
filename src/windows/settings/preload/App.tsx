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
const STATE_RETENTION_MS = 60_000;

function getInitialTab(): number {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const { id, timestamp } = JSON.parse(saved);
			if (typeof timestamp === "number" && Date.now() - timestamp < STATE_RETENTION_MS) {
				const idx = categories.findIndex((c) => toId(c) === id);
				if (idx !== -1) return idx;
			}
		}
	} catch {
		// Ignore local storage errors
	}
	return 0;
}

export function App(): JSX.Element {
	const [activeTab, setActiveTab] = useState(getInitialTab);
	const [revealedPanels, setRevealedPanels] = useState<Set<number>>(() => new Set());
	const [warningDismissed, setWarningDismissed] = useState(false);

	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const searchContainerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const easterEgg = useEasterEgg(categories.length);

	const handleTabClick = (index: number, e: MouseEvent) => {
		const tripleClick = easterEgg.handleClick(index, e);
		if (tripleClick) {
			setRevealedPanels((prev) => {
				const next = new Set(prev);
				next.add(index);
				return next;
			});
		}
		setActiveTab(index);

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: toId(categories[index]), timestamp: Date.now() }));
		} catch {
			// Ignore local storage errors
		}
	};

	const closeSearch = useCallback(() => {
		setIsSearchOpen(false);
		setSearchQuery("");
	}, []);

	const toggleSearch = useCallback(() => {
		if (isSearchOpen) {
			closeSearch();
		} else {
			setIsSearchOpen(true);
		}
	}, [isSearchOpen, closeSearch]);

	// Auto-focus search input with timer cleanup when search opens
	useEffect(() => {
		if (!isSearchOpen) return;

		const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
		return () => clearTimeout(timer);
	}, [isSearchOpen]);

	// Only close on outside click if the user has NOT typed anything yet
	useEffect(() => {
		if (!isSearchOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (searchQuery.trim().length > 0) return;

			if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
				closeSearch();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isSearchOpen, searchQuery, closeSearch]);

	const searchResults = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];

		const matches: { category: CategoryName; key: ConfigKey; entry: SettingEntry }[] = [];
		for (const cat of categories) {
			for (const [key, entry] of Object.entries(settingsSchema[cat])) {
				if (key.startsWith("button-")) continue;

				const label = (i(`opt-${key}`) ?? key).toLowerCase();
				const desc = (i(`opt-${key}-desc`) ?? (entry as SettingEntry).description ?? "").toLowerCase();

				if (key.toLowerCase().includes(q) || label.includes(q) || desc.includes(q)) {
					matches.push({ category: cat, key: key as ConfigKey, entry: entry as SettingEntry });
				}
			}
		}
		return matches;
	}, [searchQuery]);

	useEffect(() => {
		if (getConfig("disableSettingsAnimations")) {
			document.body.classList.add("disable-animations");
		}
	}, []);

	const isShowingSearchResults = isSearchOpen && searchQuery.trim().length > 0;

	return (
		<div class="settings-page-container">
			<header class="settings-header">
				<nav class="settings-tabs" aria-label="Settings Categories">
					{categories.map((name, idx) => (
						<button type="button" key={name} class={`tab-item${idx === activeTab && !isShowingSearchResults ? " active" : ""}`} role="tab" aria-selected={idx === activeTab} aria-controls={toId(name)} onClick={(e) => handleTabClick(idx, e)}>
							{i(`category-${name.toLowerCase().split(" ")[0]}`)}
						</button>
					))}

					<button type="button" class={`tab-item search-toggle-btn${isSearchOpen ? " active" : ""}`} onClick={toggleSearch} title={i("settings-search")}>
						🔍
					</button>
				</nav>

				{isSearchOpen && (
					<div class="search-overlay" ref={searchContainerRef}>
						<input
							ref={searchInputRef}
							type="text"
							role="searchbox"
							class="text search-input"
							placeholder={i("settings-search-placeholder")}
							value={searchQuery}
							onInput={(e) => setSearchQuery((e.currentTarget as HTMLInputElement).value)}
							onKeyDown={(e) => {
								if (e.key === "Escape") closeSearch();
							}}
						/>
						<button type="button" class="search-close-btn" title="Close search" onClick={closeSearch}>
							✕
						</button>
					</div>
				)}
			</header>

			{!isEncryptionAvailable() && !warningDismissed && (
				<div class="message warning">
					<p>{i("settings-encryption-unavailable")}</p>
					<button type="button" class="message-dismiss-btn" aria-label="Dismiss warning" onClick={() => setWarningDismissed(true)}>
						✕
					</button>
				</div>
			)}

			<div class="settings-content">
				{isShowingSearchResults ? (
					<div class="content-panel active">
						<form class="settingsContainer">
							{searchResults.length === 0 ? (
								<p class="description" style={{ margin: "30px 0" }}>
									{i("settings-search-no-results")}
								</p>
							) : (
								searchResults.map(({ key, entry }) => <SettingField key={key} settingKey={key} entry={entry} forceVisible={true} />)
							)}
						</form>
					</div>
				) : (
					categories.map((name, idx) => <SettingsPanel key={name} name={name} active={idx === activeTab} revealed={revealedPanels.has(idx)} />)
				)}
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

	const { settings, buttons } = useMemo(() => {
		const s: [ConfigKey, SettingEntry][] = [];
		const b: [string, ButtonEntry][] = [];
		for (const [key, entry] of Object.entries(category)) {
			if (key.startsWith("button-")) {
				b.push([key, entry as ButtonEntry]);
			} else {
				s.push([key as ConfigKey, entry as SettingEntry]);
			}
		}
		return { settings: s, buttons: b };
	}, [category]);

	const handleButtonClick = (entry: ButtonEntry) => {
		const [fnName, ...args] = entry.action;
		const actionFn = buttonClickActions[fnName as ActionKey];
		if (typeof actionFn === "function") {
			// @ts-expect-error Safe dynamic invocation
			void actionFn(...args);
		} else {
			console.warn(`Unknown action: ${fnName}`);
		}
	};

	return (
		<div id={toId(name)} class={`content-panel${active ? " active" : ""}`} role="tabpanel">
			<form class="settingsContainer">
				{settings.map(([key, entry]) => (
					<SettingField key={key} settingKey={key} entry={entry} forceVisible={revealed} />
				))}

				{buttons.length > 0 && (
					<div class="buttonContainer">
						{buttons.map(([key, entry]) => (
							<button key={key} type="button" onClick={() => handleButtonClick(entry)}>
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
			if (tabIndex === -1) return false;
			const now = Date.now();
			const state = clickState.current;
			const isSame = tabIndex === state.tabIndex;
			const isQuick = now - state.time <= 300;

			state.count = isSame && isQuick ? state.count + 1 : 1;
			state.time = now;
			state.tabIndex = tabIndex;

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
