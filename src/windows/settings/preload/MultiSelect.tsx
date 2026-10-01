import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

interface MultiSelectProps {
	id: string;
	options: string[];
	value: string[];
	onChange: (value: unknown) => void;
	placeholder?: string;
}

const MAX_VISIBLE_CHIPS = 3;

export function MultiSelect({ id, options, value, onChange, placeholder = "Select..." }: MultiSelectProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const [highlightIndex, setHighlightIndex] = useState(-1);
	const [searchText, setSearchText] = useState("");
	const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const safeValue = useMemo(() => (Array.isArray(value) ? value : []), [value]);
	const selected = useMemo(() => new Set(safeValue), [safeValue]);

	const toggleOption = useCallback(
		(opt: string) => {
			const newValue = selected.has(opt) ? safeValue.filter((v) => v !== opt) : [...safeValue, opt];
			onChange(newValue);
		},
		[safeValue, selected, onChange],
	);

	const open = useCallback(() => {
		setIsOpen(true);
		if (options.length === 0) {
			setHighlightIndex(-1);
			return;
		}
		const firstSelectedIndex = options.findIndex((o) => selected.has(o));
		setHighlightIndex(firstSelectedIndex !== -1 ? firstSelectedIndex : 0);
	}, [options, selected]);

	const close = useCallback(() => {
		setIsOpen(false);
		setSearchText("");
		if (searchTimeout.current) clearTimeout(searchTimeout.current);
	}, []);

	// Clear search timeout on unmount
	useEffect(() => {
		return () => {
			if (searchTimeout.current) clearTimeout(searchTimeout.current);
		};
	}, []);

	// Listen for outside clicks only while open
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				close();
			}
		};

		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, [isOpen, close]);

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

			if (options.length === 0) {
				if (e.key === "Escape") close();
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
					if (highlightIndex >= 0 && highlightIndex < options.length) {
						toggleOption(options[highlightIndex]);
					}
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
	const visibleChips = safeValue.slice(0, MAX_VISIBLE_CHIPS);
	const hiddenCount = safeValue.length - MAX_VISIBLE_CHIPS;

	return (
		<div ref={containerRef} class={`multiselect-dropdown${isOpen ? " open" : ""}`} id={id} setting-name={id} role="listbox" aria-label="Multiselect dropdown" aria-activedescendant={activeDescendantId} aria-expanded={isOpen} tabIndex={0} onClick={() => (isOpen ? close() : open())} onKeyDown={handleKeyDown}>
			{safeValue.length === 0 ? (
				<span class="placeholder">{placeholder}</span>
			) : (
				<>
					{visibleChips.map((v) => (
						<span key={v} class="optext">
							{v}
						</span>
					))}
					{hiddenCount > 0 && (
						<span class="optext" title={safeValue.slice(MAX_VISIBLE_CHIPS).join(", ")}>
							+{hiddenCount} more
						</span>
					)}
				</>
			)}

			<div class={`multiselect-dropdown-list-wrapper${isOpen ? "" : " dropdown-hidden"}`} onClick={(e) => e.stopPropagation()}>
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
