function MultiselectDropdown(options) {
	const config = {
		placeholder: "Select...",
		...options,
	};

	function createElement(tag, attrs = {}) {
		const element = document.createElement(tag);
		Object.entries(attrs).forEach(([key, value]) => {
			if (key === "class") {
				if (Array.isArray(value)) {
					value.filter((cls) => cls !== "").forEach((cls) => element.classList.add(cls));
				} else if (value !== "") {
					element.classList.add(value);
				}
			} else if (key === "style") {
				Object.entries(value).forEach(([styleKey, styleValue]) => {
					element.style[styleKey] = styleValue;
				});
			} else if (key === "text") {
				element.textContent = value === "" ? "\u00A0" : value;
			} else if (key === "html") {
				element.innerHTML = value;
			} else {
				element[key] = value;
			}
		});
		return element;
	}

	document.querySelectorAll("select[multiple]").forEach((selectElement) => {
		selectElement.style.display = "none";

		const dropdownContainer = createElement("div", {
			class: "multiselect-dropdown",
			role: "listbox",
			"aria-label": selectElement.getAttribute("aria-label") || "Multiselect dropdown",
			tabIndex: 0,
		});
		selectElement.parentNode.insertBefore(dropdownContainer, selectElement.nextSibling);

		const listWrapper = createElement("div", { class: ["multiselect-dropdown-list-wrapper", "dropdown-hidden"] });
		const optionsList = createElement("div", { class: "multiselect-dropdown-list" });

		dropdownContainer.appendChild(listWrapper);
		listWrapper.appendChild(optionsList);

		selectElement.loadOptions = () => {
			optionsList.innerHTML = "";
			Array.from(selectElement.options).forEach((option) => {
				const optionItem = createElement("div", {
					class: ["multiselect-dropdown-list-option", option.selected ? "checked" : ""],
					optEl: option,
					role: "option",
					"aria-selected": option.selected,
					tabIndex: -1,
				});

				const optionLabel = createElement("label", { text: option.text });
				optionItem.appendChild(optionLabel);

				optionItem.addEventListener("click", (e) => {
					e.stopPropagation();
					toggleOption(optionItem);
				});

				option.listitemEl = optionItem;
				optionsList.appendChild(optionItem);
			});
		};

		function toggleOption(optionItem) {
			const option = optionItem.optEl;
			option.selected = !option.selected;
			optionItem.setAttribute("aria-selected", option.selected);
			optionItem.classList.toggle("checked", option.selected);
			selectElement.dispatchEvent(new Event("change"));
			refreshDropdown();
		}

		const refreshDropdown = () => {
			dropdownContainer.querySelectorAll("span.optext, span.placeholder").forEach((el) => dropdownContainer.removeChild(el));
			const selectedOptions = Array.from(selectElement.selectedOptions);
			if (selectedOptions.length === 0) {
				dropdownContainer.appendChild(createElement("span", { class: "placeholder", text: config.placeholder }));
			} else {
				selectedOptions.forEach((option) => {
					const tag = createElement("span", { class: "optext", text: option.text, srcOption: option });
					dropdownContainer.appendChild(tag);
				});
			}
		};

		selectElement.loadOptions();
		refreshDropdown();

		let searchString = "";
		let searchTimeout = null;
		let highlightIndex = -1;

		function updateHighlight() {
			const allOptions = optionsList.querySelectorAll(".multiselect-dropdown-list-option");
			allOptions.forEach((item) => item.classList.remove("highlighted"));

			if (highlightIndex >= 0 && highlightIndex < allOptions.length) {
				const highlightedItem = allOptions[highlightIndex];
				highlightedItem.classList.add("highlighted");
				highlightedItem.scrollIntoView({ block: "center" });
			}
		}

		function openDropdown() {
			listWrapper.classList.remove("dropdown-hidden");
			dropdownContainer.classList.add("open");
			highlightIndex = Array.from(selectElement.options).findIndex((o) => o.selected);
			if (highlightIndex === -1) highlightIndex = 0;
			updateHighlight();
		}

		function closeDropdown() {
			listWrapper.classList.add("dropdown-hidden");
			dropdownContainer.classList.remove("open");
			// --- NEW: Clear search state on close ---
			searchString = "";
			clearTimeout(searchTimeout);
		}

		dropdownContainer.addEventListener("click", () => {
			if (listWrapper.classList.contains("dropdown-hidden")) {
				openDropdown();
			} else {
				closeDropdown();
			}
		});

		document.addEventListener("click", (event) => {
			if (!dropdownContainer.contains(event.target)) {
				closeDropdown();
			}
		});

		dropdownContainer.addEventListener("keydown", (e) => {
			if (listWrapper.classList.contains("dropdown-hidden")) {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					openDropdown();
				}
				return;
			}

			const allOptions = Array.from(optionsList.children);
			if (allOptions.length === 0) return;

			if (e.key === "Escape") {
				closeDropdown();
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				highlightIndex = (highlightIndex + 1) % allOptions.length;
				searchString = "";
				updateHighlight();
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				highlightIndex = (highlightIndex - 1 + allOptions.length) % allOptions.length;
				searchString = "";
				updateHighlight();
			} else if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				if (highlightIndex > -1) {
					toggleOption(allOptions[highlightIndex]);
				}
			} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				clearTimeout(searchTimeout);
				searchString += e.key.toLowerCase();

				searchTimeout = setTimeout(() => {
					searchString = "";
				}, 700);

				const matchingIndex = allOptions.findIndex((option) => option.textContent.toLowerCase().includes(searchString));

				if (matchingIndex !== -1) {
					highlightIndex = matchingIndex;
					updateHighlight();
				}
			}
		});

		selectElement.addEventListener("change", refreshDropdown);
	});
}

window.initMultiselect = () => {
	MultiselectDropdown(window.MultiselectDropdownOptions || {});
};
