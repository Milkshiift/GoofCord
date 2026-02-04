import type { JSX } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

interface MultiSelectProps {
	id: string;
	options: string[];
	value: string[];
	onChange: (value: unknown) => void;
	placeholder?: string;
}

export function MultiSelect({ id, options, value, onChange, placeholder = "Select..." }: MultiSelectProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const [highlightIndex, setHighlightIndex] = useState(-1);
	const [searchText, setSearchText] = useState("");
	const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const selected = new Set(value);

	const toggleOption = useCallback(
		(opt: string) => {
			const newValue = selected.has(opt) ? value.filter((v) => v !== opt) : [...value, opt];
			onChange(newValue);
		},
		[value, selected, onChange],
	);

	const open = useCallback(() => {
		setIsOpen(true);
		setHighlightIndex(
			Math.max(
				0,
				options.findIndex((o) => selected.has(o)),
			),
		);
	}, [options, selected]);

	const close = useCallback(() => {
		setIsOpen(false);
		setSearchText("");
		if (searchTimeout.current) clearTimeout(searchTimeout.current);
	}, []);

	// Close on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				close();
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, [close]);

	// Scroll highlighted item into view
	useEffect(() => {
		if (isOpen && listRef.current) {
			const items = listRef.current.children;
			if (highlightIndex >= 0 && highlightIndex < items.length) {
				items[highlightIndex]?.scrollIntoView({ block: "nearest" });
			}
		}
	}, [highlightIndex, isOpen]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!isOpen) {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					open();
				}
				return;
			}

			switch (e.key) {
				case "Escape":
					close();
					break;
				case "ArrowDown":
					e.preventDefault();
					setHighlightIndex((i) => (i + 1) % options.length);
					setSearchText("");
					break;
				case "ArrowUp":
					e.preventDefault();
					setHighlightIndex((i) => (i - 1 + options.length) % options.length);
					setSearchText("");
					break;
				case "Enter":
				case " ":
					e.preventDefault();
					if (highlightIndex >= 0) toggleOption(options[highlightIndex]);
					break;
				default:
					if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
						e.preventDefault();
						if (searchTimeout.current) clearTimeout(searchTimeout.current);

						const newSearch = searchText + e.key.toLowerCase();
						setSearchText(newSearch);

						searchTimeout.current = setTimeout(() => setSearchText(""), 700);

						const matchIndex = options.findIndex((opt) => opt.toLowerCase().includes(newSearch));
						if (matchIndex !== -1) setHighlightIndex(matchIndex);
					}
			}
		},
		[isOpen, options, highlightIndex, searchText, open, close, toggleOption],
	);

	const activeDescendantId = isOpen && highlightIndex >= 0 ? `${id}-opt-${highlightIndex}` : undefined;

	return (
		<div ref={containerRef} class={`multiselect-dropdown${isOpen ? " open" : ""}`} id={id} setting-name={id} role="listbox" aria-label="Multiselect dropdown" aria-activedescendant={activeDescendantId} aria-expanded={isOpen} tabIndex={0} onClick={() => (isOpen ? close() : open())} onKeyDown={handleKeyDown}>
			{value.length === 0 ? (
				<span class="placeholder">{placeholder}</span>
			) : (
				value.map((v) => (
					<span key={v} class="optext">
						{v}
					</span>
				))
			)}

			<div class={`multiselect-dropdown-list-wrapper${isOpen ? "" : " dropdown-hidden"}`}>
				<div ref={listRef} class="multiselect-dropdown-list">
					{options.map((opt, idx) => (
						<div
							key={opt}
							id={`${id}-opt-${idx}`}
							class={`multiselect-dropdown-list-option${selected.has(opt) ? " checked" : ""}${idx === highlightIndex ? " highlighted" : ""}`}
							role="option"
							aria-selected={selected.has(opt)}
							tabIndex={-1}
							onClick={(e) => {
								e.stopPropagation();
								toggleOption(opt);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.stopPropagation();
									e.preventDefault();
									toggleOption(opt);
								}
							}}
						>
							<span>{opt || "\u00A0"}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
