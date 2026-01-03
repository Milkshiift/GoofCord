interface TabState {
	id: string;
	timestamp: number;
}

const STORAGE_KEY = "tabSwitcherState";
const STATE_RETENTION_MS = 15_000;
const TRIPLE_CLICK_MS = 300;

export class TabSwitcher {
	private container!: HTMLElement;
	private tabs: HTMLElement[] = [];
	private panels: HTMLElement[] = [];

	private clickState = { count: 0, time: 0, tab: null as HTMLElement | null };
	private secretProgress: number[] = [];
	private secretTarget: number[] = [];

	init(): void {
		const container = document.querySelector<HTMLElement>(".settings-tabs");
		if (!container) return;

		this.container = container;
		this.tabs = Array.from(container.querySelectorAll(".tab-item"));
		this.panels = Array.from(document.querySelectorAll(".settings-content .content-panel"));

		this.secretTarget = this.generateSecretSequence();
		this.setupAccessibility();
		this.bindEvents();
		this.restoreState();
	}

	private generateSecretSequence(): number[] {
		const n = this.tabs.length;
		if (n < 3) return [];

		// Alternating left-right pattern
		const seq: number[] = [];
		for (let l = 0, r = n - 1; l <= r; l++, r--) {
			seq.push(l);
			if (l !== r) seq.push(r);
		}
		return seq;
	}

	private setupAccessibility(): void {
		this.container.setAttribute("role", "tablist");

		for (const tab of this.tabs) {
			tab.setAttribute("role", "tab");
			tab.setAttribute("tabindex", "0");
			tab.setAttribute("aria-controls", tab.dataset.target ?? "");
			tab.setAttribute("aria-selected", String(tab.classList.contains("active")));
		}

		for (const panel of this.panels) {
			panel.setAttribute("role", "tabpanel");
			panel.setAttribute("tabindex", "0");
		}
	}

	private bindEvents(): void {
		this.container.addEventListener("click", (e) => this.handleClick(e));
		document.addEventListener("keydown", (e) => this.handleKeydown(e));
	}

	private handleClick(e: MouseEvent): void {
		const tab = (e.target as HTMLElement).closest<HTMLElement>(".tab-item");
		if (!tab) return;

		const now = Date.now();
		const isSame = tab === this.clickState.tab;
		const isQuick = now - this.clickState.time <= TRIPLE_CLICK_MS;

		this.clickState.count = isSame && isQuick ? this.clickState.count + 1 : 1;
		this.clickState.time = now;
		this.clickState.tab = tab;

		if (this.clickState.count === 3) {
			this.revealHiddenSettings(tab);
			this.showConfetti(tab, "👁️", 25);
			this.clickState.count = 0;
		} else if (this.clickState.count === 1) {
			this.activateTab(tab);
			this.checkSecret(this.tabs.indexOf(tab));
		}
	}

	private handleKeydown(e: KeyboardEvent): void {
		const active = document.activeElement as HTMLElement;
		if (["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) || active.isContentEditable) return;
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

		e.preventDefault();

		const currentIndex = this.tabs.findIndex((t) => t.classList.contains("active"));
		const direction = e.key === "ArrowRight" ? 1 : -1;
		const nextIndex = (currentIndex + direction + this.tabs.length) % this.tabs.length;
		const nextTab = this.tabs[nextIndex];

		this.activateTab(nextTab);
		nextTab.focus();
	}

	private activateTab(tab: HTMLElement): void {
		const targetId = tab.dataset.target;
		if (!targetId) return;

		const panel = document.getElementById(targetId);
		if (!panel) return;

		for (const t of this.tabs) {
			const isActive = t === tab;
			t.classList.toggle("active", isActive);
			t.setAttribute("aria-selected", String(isActive));
		}

		for (const p of this.panels) {
			p.classList.toggle("active", p === panel);
		}

		this.saveState(targetId);
		window.scrollTo(0, 0);
	}

	private saveState(id: string): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, timestamp: Date.now() } as TabState));
		} catch {}
	}

	private restoreState(): void {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;

			const state = JSON.parse(raw) as TabState;
			if (Date.now() - state.timestamp > STATE_RETENTION_MS) return;

			const tab = this.tabs.find((t) => t.dataset.target === state.id);
			if (tab) this.activateTab(tab);
		} catch {
			// Use default tab
		}
	}

	private revealHiddenSettings(tab: HTMLElement): void {
		const panel = document.getElementById(tab.dataset.target ?? "");
		for (const f of panel?.querySelectorAll("fieldset.hidden") || []) {
			f.classList.remove("hidden");
		}
	}

	private checkSecret(tabIndex: number): void {
		this.secretProgress.push(tabIndex);
		if (this.secretProgress.length > this.secretTarget.length) {
			this.secretProgress.shift();
		}

		const matches = this.secretProgress.length === this.secretTarget.length && this.secretProgress.every((v, i) => v === this.secretTarget[i]);

		if (matches) {
			this.triggerSecret();
			this.secretProgress = [];
		}
	}

	private triggerSecret(): void {
		// Tab confetti wave
		this.tabs.forEach((tab, i) => {
			setTimeout(() => this.showConfetti(tab, "🎉", 15), i * 150);
		});

		// Letter reveal
		const letters = ["🇬", "🇴", "🇴", "🇫", "🇨", "🇴", "🇷", "🇩"];
		const startDelay = this.tabs.length * 150;

		letters.forEach((letter, i) => {
			setTimeout(
				() => {
					const el = document.createElement("div");
					el.style.cssText = `position:fixed;top:${25 + Math.random() * 50}%;left:${25 + Math.random() * 50}%`;
					document.body.appendChild(el);
					this.showConfetti(el, letter, 10);
					el.remove();
				},
				startDelay + i * 250,
			);
		});
	}

	private showConfetti(origin: HTMLElement, emoji: string, count: number): void {
		const rect = origin.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;

		const fragment = document.createDocumentFragment();

		for (let i = 0; i < count; i++) {
			const el = document.createElement("div");
			el.textContent = emoji;

			const angle = Math.random() * Math.PI * 2;
			const distance = 50 + Math.random() * 100;
			const duration = 800 + Math.random() * 600;

			el.style.cssText = `
				position:fixed;left:${cx}px;top:${cy}px;
				font-size:${10 + Math.random() * 15}px;
				pointer-events:none;z-index:9999;will-change:transform,opacity;
			`;

			const anim = el.animate(
				[
					{ transform: "translate(0,0)", opacity: 1 },
					{ transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px)`, opacity: 0 },
				],
				{ duration, easing: "cubic-bezier(0.25,0.46,0.45,0.94)" },
			);

			anim.onfinish = () => el.remove();
			fragment.appendChild(el);
		}

		document.body.appendChild(fragment);
	}
}
