window.initSwitcher = () => {
	const SELECTORS = {
		container: ".settings-tabs",
		tab: ".tab-item",
		content: ".settings-content .content-panel",
		fieldset: "fieldset",
	};

	const CONFIG = {
		tripleClickTime: 300,
		tripleClickCount: 3,
		storageKey: "tabSwitcherState",
		retentionTime: 15000,
	};

	function cacheDOMElements() {
		const container = document.querySelector(SELECTORS.container);
		if (!container) {
			console.warn("Settings tabs container not found.");
			return null;
		}
		return {
			container,
			tabs: [...container.querySelectorAll(SELECTORS.tab)],
			panels: [...document.querySelectorAll(SELECTORS.content)],
		};
	}

	const elements = cacheDOMElements();
	if (!elements) return;

	const state = {
		secretSequence: [],
		correctSequence: generateSecretSequence(elements.tabs.length),
	};

	const clickTracking = { count: 0, lastTime: 0, lastTab: null };

	function generateSecretSequence(tabCount) {
		if (tabCount < 3) return [];
		const sequence = [];
		let left = 0;
		let right = tabCount - 1;
		while (left <= right) {
			sequence.push(left);
			if (left !== right) sequence.push(right);
			left++;
			right--;
		}
		return sequence;
	}

	function saveTabState(targetId) {
		const data = {
			id: targetId,
			timestamp: Date.now(),
		};
		localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
	}

	function activateTab(tabToActivate) {
		const targetId = tabToActivate.dataset.target;
		const panelToActivate = document.getElementById(targetId);
		if (!panelToActivate) return;

		for (const tab of elements.tabs) {
			const isActive = tab === tabToActivate;
			tab.classList.toggle("active", isActive);
			tab.setAttribute("aria-selected", isActive);
		}

		for (const panel of elements.panels) {
			panel.classList.toggle("active", panel === panelToActivate);
		}

		saveTabState(targetId);

		window.scrollTo(0, 0);
	}

	function unhideSettings(tabElement) {
		const targetId = tabElement?.dataset.target;
		const targetPanel = targetId && document.getElementById(targetId);
		if (targetPanel) {
			for (const fieldset of targetPanel.querySelectorAll(SELECTORS.fieldset)) {
				fieldset.classList.remove("hidden");
			}
		}
	}

	function showConfetti(event, { emoji = "✨", count = 20, fontSizeMin = 10, fontSizeMax = 25, speedMin = 50, speedMax = 150, durationMin = 0.8, durationMax = 1.4 } = {}) {
		const rect = event.target.getBoundingClientRect();
		const origin = {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
		};

		for (let i = 0; i < count; i++) {
			const confetti = document.createElement("div");
			confetti.textContent = emoji;
			confetti.style.cssText = `
                position: fixed;
                left: ${origin.x}px;
                top: ${origin.y}px;
                font-size: ${Math.random() * (fontSizeMax - fontSizeMin) + fontSizeMin}px;
                pointer-events: none;
                z-index: 9999;
                will-change: transform, opacity;
            `;
			document.body.appendChild(confetti);

			const angle = Math.random() * 2 * Math.PI;
			const speed = Math.random() * (speedMax - speedMin) + speedMin;
			const endX = Math.cos(angle) * speed;
			const endY = Math.sin(angle) * speed;
			const duration = (Math.random() * (durationMax - durationMin) + durationMin) * 1000;

			confetti.animate(
				[
					{ transform: "translate(0, 0)", opacity: 1 },
					{ transform: `translate(${endX}px, ${endY}px)`, opacity: 0 },
				],
				{
					duration,
					easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
				},
			).onfinish = () => confetti.remove();
		}
	}

	function randomIntFromInterval(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	function triggerSecretAnimation() {
		console.log("Secret sequence activated! 🎉");

		elements.tabs.forEach((tab, index) => {
			setTimeout(() => {
				showConfetti(
					{ target: tab },
					{
						emoji: "🎉",
						count: 15,
						speedMin: 100,
						speedMax: 200,
					},
				);
			}, index * 150);
		});

		const tabAnimationDuration = elements.tabs.length * 150;
		setTimeout(() => {
			const letters = ["🇬", "🇴", "🇴", "🇫", "🇨", "🇴", "🇷", "🇩"];
			letters.forEach((letter, i) => {
				setTimeout(() => {
					const tempSource = document.createElement("div");
					tempSource.style.position = "fixed";
					tempSource.style.top = `${randomIntFromInterval(25, 75)}%`;
					tempSource.style.left = `${randomIntFromInterval(25, 75)}%`;

					document.body.appendChild(tempSource);

					showConfetti(
						{ target: tempSource },
						{
							emoji: letter,
							count: 10,
							fontSizeMin: 15,
							fontSizeMax: 30,
							durationMin: 1,
							durationMax: 3,
							speedMin: 150,
							speedMax: 250,
						},
					);

					tempSource.remove();
				}, i * 250);
			});
		}, tabAnimationDuration);
	}

	function checkSecretSequence(tabIndex) {
		state.secretSequence.push(tabIndex);
		if (state.secretSequence.length > state.correctSequence.length) {
			state.secretSequence.shift();
		}
		const isMatch = state.secretSequence.length === state.correctSequence.length && state.secretSequence.every((val, idx) => val === state.correctSequence[idx]);
		if (isMatch) {
			triggerSecretAnimation();
			state.secretSequence = [];
		}
	}

	function handleTabClick(event) {
		const clickedTab = event.target.closest(SELECTORS.tab);
		if (!clickedTab) return;

		const now = Date.now();
		if (clickedTab !== clickTracking.lastTab || now - clickTracking.lastTime > CONFIG.tripleClickTime) {
			clickTracking.count = 1;
		} else {
			clickTracking.count++;
		}
		clickTracking.lastTime = now;
		clickTracking.lastTab = clickedTab;

		if (clickTracking.count === CONFIG.tripleClickCount) {
			unhideSettings(clickedTab);
			showConfetti(event, { emoji: "👁️", count: 25 });
			clickTracking.count = 0;
		} else if (clickTracking.count === 1) {
			activateTab(clickedTab);
			checkSecretSequence(elements.tabs.indexOf(clickedTab));
		}
	}

	function handleKeyNavigation(event) {
		// Check if the user is typing
		const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
		if (isInput) return;

		if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
		event.preventDefault();
		const activeIndex = elements.tabs.findIndex((tab) => tab.classList.contains("active"));
		if (activeIndex === -1) {
			activateTab(elements.tabs[0]);
			return;
		}
		const direction = event.key === "ArrowRight" ? 1 : -1;
		const nextIndex = (activeIndex + direction + elements.tabs.length) % elements.tabs.length;
		activateTab(elements.tabs[nextIndex]);
	}

	function determineInitialTab() {
		const rawState = localStorage.getItem(CONFIG.storageKey);

		if (rawState) {
			try {
				const savedState = JSON.parse(rawState);
				const now = Date.now();
				const elapsed = now - savedState.timestamp;

				if (elapsed <= CONFIG.retentionTime) {
					const savedTab = elements.tabs.find((tab) => tab.dataset.target === savedState.id);
					if (savedTab) return savedTab;
				}
			} catch (e) {
				console.error("Error parsing tab state", e);
			}
		}

		return elements.tabs.find((tab) => tab.classList.contains("active")) || elements.tabs[0];
	}

	function init() {
		elements.container.setAttribute("role", "tablist");
		for (const tab of elements.tabs) {
			tab.setAttribute("role", "tab");
			tab.setAttribute("tabindex", "0");
			tab.setAttribute("aria-controls", tab.dataset.target);
			tab.setAttribute("aria-selected", tab.classList.contains("active"));
		}
		for (const panel of elements.panels) {
			panel.setAttribute("role", "tabpanel");
			panel.setAttribute("tabindex", "0");
		}

		elements.container.addEventListener("click", handleTabClick);
		document.addEventListener("keydown", handleKeyNavigation);

		if (elements.tabs.length > 0) {
			const initialTab = determineInitialTab();
			activateTab(initialTab);
		}
	}

	init();
};
