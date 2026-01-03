export class MultiselectDropdown {
	private readonly select: HTMLSelectElement;
	private readonly container: HTMLDivElement;
	private readonly listWrapper: HTMLDivElement;
	private readonly optionsList: HTMLDivElement;
	private readonly placeholder: string;

	private searchState = { text: "", timeout: undefined as ReturnType<typeof setTimeout> | undefined };
	private highlightIndex = -1;

	constructor(select: HTMLSelectElement, placeholder = "Select...") {
		this.select = select;
		this.placeholder = placeholder;
		this.select.style.display = "none";

		this.container = this.createContainer();
		this.listWrapper = document.createElement("div");
		this.listWrapper.className = "multiselect-dropdown-list-wrapper dropdown-hidden";

		this.optionsList = document.createElement("div");
		this.optionsList.className = "multiselect-dropdown-list";

		this.listWrapper.appendChild(this.optionsList);
		this.container.appendChild(this.listWrapper);
		select.after(this.container);

		this.render();
		this.bindEvents();
	}

	private createContainer(): HTMLDivElement {
		const container = document.createElement("div");
		container.className = "multiselect-dropdown";
		container.setAttribute("role", "listbox");
		container.setAttribute("aria-label", this.select.getAttribute("aria-label") ?? "Multiselect dropdown");
		container.tabIndex = 0;
		return container;
	}

	private render(): void {
		this.renderOptions();
		this.renderSelectedTags();
	}

	private renderOptions(): void {
		this.optionsList.innerHTML = "";

		for (const option of this.select.options) {
			const item = document.createElement("div");
			item.className = `multiselect-dropdown-list-option${option.selected ? " checked" : ""}`;
			item.setAttribute("role", "option");
			item.setAttribute("aria-selected", String(option.selected));
			item.tabIndex = -1;

			const label = document.createElement("label");
			label.textContent = option.text || "\u00A0";
			item.appendChild(label);

			item.addEventListener("click", (e) => {
				e.stopPropagation();
				option.selected = !option.selected;
				item.classList.toggle("checked", option.selected);
				item.setAttribute("aria-selected", String(option.selected));
				this.select.dispatchEvent(new Event("change"));
				this.renderSelectedTags();
			});

			this.optionsList.appendChild(item);
		}
	}

	private renderSelectedTags(): void {
		for (const el of this.container.querySelectorAll("span.optext, span.placeholder")) {
			el.remove();
		}

		const selected = Array.from(this.select.selectedOptions);

		if (selected.length === 0) {
			const span = document.createElement("span");
			span.className = "placeholder";
			span.textContent = this.placeholder;
			this.container.appendChild(span);
		} else {
			for (const option of selected) {
				const span = document.createElement("span");
				span.className = "optext";
				span.textContent = option.text || "\u00A0";
				this.container.appendChild(span);
			}
		}
	}

	private get items(): HTMLDivElement[] {
		return Array.from(this.optionsList.querySelectorAll(".multiselect-dropdown-list-option"));
	}

	private get isOpen(): boolean {
		return !this.listWrapper.classList.contains("dropdown-hidden");
	}

	private open(): void {
		this.listWrapper.classList.remove("dropdown-hidden");
		this.container.classList.add("open");
		this.highlightIndex = Math.max(
			0,
			Array.from(this.select.options).findIndex((o) => o.selected),
		);
		this.updateHighlight();
	}

	private close(): void {
		this.listWrapper.classList.add("dropdown-hidden");
		this.container.classList.remove("open");
		this.searchState.text = "";
		clearTimeout(this.searchState.timeout);
	}

	private updateHighlight(): void {
		const items = this.items;
		for (const item of items) {
			const i = items.indexOf(item);
			item.classList.toggle("highlighted", i === this.highlightIndex);
		}
		items[this.highlightIndex]?.scrollIntoView({ block: "center" });
	}

	private bindEvents(): void {
		this.container.addEventListener("click", () => (this.isOpen ? this.close() : this.open()));

		document.addEventListener("click", (e) => {
			if (!this.container.contains(e.target as Node)) this.close();
		});

		this.container.addEventListener("keydown", (e) => this.handleKeydown(e));
		this.select.addEventListener("change", () => this.renderSelectedTags());
	}

	private handleKeydown(e: KeyboardEvent): void {
		// Open dropdown on Enter/Space when closed
		if (!this.isOpen) {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				this.open();
			}
			return;
		}

		const items = this.items;
		if (items.length === 0) return;

		const handlers: Record<string, () => void> = {
			Escape: () => this.close(),
			ArrowDown: () => {
				e.preventDefault();
				this.highlightIndex = (this.highlightIndex + 1) % items.length;
				this.searchState.text = "";
				this.updateHighlight();
			},
			ArrowUp: () => {
				e.preventDefault();
				this.highlightIndex = (this.highlightIndex - 1 + items.length) % items.length;
				this.searchState.text = "";
				this.updateHighlight();
			},
			Enter: () => {
				e.preventDefault();
				items[this.highlightIndex]?.click();
			},
			" ": () => {
				e.preventDefault();
				items[this.highlightIndex]?.click();
			},
		};

		if (handlers[e.key]) {
			handlers[e.key]();
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			this.typeAheadSearch(e.key, items);
		}
	}

	private typeAheadSearch(char: string, items: HTMLDivElement[]): void {
		clearTimeout(this.searchState.timeout);
		this.searchState.text += char.toLowerCase();
		this.searchState.timeout = setTimeout(() => {
			this.searchState.text = "";
		}, 700);

		const match = items.findIndex((item) => item.textContent?.toLowerCase().includes(this.searchState.text));

		if (match !== -1) {
			this.highlightIndex = match;
			this.updateHighlight();
		}
	}
}
