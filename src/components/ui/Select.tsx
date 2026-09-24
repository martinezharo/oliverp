"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { filterInput, input } from "@/components/ui/form";

/**
 * The app's dropdown.
 *
 * A native `<select>` opens an OS menu that ignores the dark theme on most
 * platforms (white lists on Windows, a system sheet on phones), so every
 * picker in the app looked foreign next to the fields around it. This one
 * follows the WAI-ARIA "select-only combobox" pattern: focus stays on the
 * trigger and the highlighted option is announced through
 * `aria-activedescendant`, so screen readers and the keyboard behave as with
 * a native control.
 *
 * The list is rendered in the top layer with the Popover API. Selects live
 * inside modals with `overflow: hidden` and inside scrolling line-item lists,
 * and an absolutely positioned list would be clipped by either.
 */

export type SelectOption = { value: string; label: string };

const trigger: Record<"md" | "sm", string> = {
  md: input,
  sm: filterInput,
};

/** Typed characters within this window are read as one word. */
const TYPEAHEAD_MS = 500;
/** Gap between the trigger and the list, in pixels. */
const GAP = 6;
/** Tailwind `max-h-64`, the tallest the list is allowed to grow. */
const LIST_MAX_HEIGHT = 256;

export default function Select({
  value,
  options,
  onChange,
  placeholder,
  size = "md",
  id,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Shown, muted, when `value` matches no option; also the empty-list text. */
  placeholder?: string;
  /** `md` matches modal form fields, `sm` the compact toolbar fields. */
  size?: "md" | "sm";
  /** Lets a `<label htmlFor>` point at the trigger. */
  id?: string;
  disabled?: boolean;
  /** Layout classes for the trigger (width, margins). */
  className?: string;
  "aria-label"?: string;
}) {
  const listId = useId();
  const ownId = useId();
  const triggerId = id ?? ownId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const optionId = (index: number) => `${listId}-${index}`;

  const show = useCallback((index: number) => {
    if (disabled) return;
    setActive(index);
    setOpen(true);
  }, [disabled]);

  const close = useCallback(() => setOpen(false), []);

  const commit = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close();
  };

  // Place the list under the trigger, or above it when the viewport has no
  // room below, and follow the trigger while anything around it scrolls.
  const place = useCallback(() => {
    const list = listRef.current;
    const button = triggerRef.current;
    if (!list || !button) return;
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP;
    const above = rect.top - GAP;
    const flip = below < Math.min(list.scrollHeight, LIST_MAX_HEIGHT) && above > below;
    list.style.left = `${rect.left}px`;
    list.style.minWidth = `${rect.width}px`;
    list.style.maxHeight = `${Math.min(LIST_MAX_HEIGHT, Math.max(flip ? above : below, 96))}px`;
    list.style.top = flip ? "auto" : `${rect.bottom + GAP}px`;
    list.style.bottom = flip ? `${window.innerHeight - rect.top + GAP}px` : "auto";
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (open) {
      if (!list.matches(":popover-open")) list.showPopover();
      place();
    } else if (list.matches(":popover-open")) {
      list.hidePopover();
    }
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, close, place]);

  useEffect(() => {
    if (open && active >= 0) {
      document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    }
    // `optionId` is derived from the stable `listId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  /** Jumps to the next option starting with what has been typed so far. */
  const findTyped = (key: string) => {
    const now = Date.now();
    const state = typeahead.current;
    state.text = now - state.at > TYPEAHEAD_MS ? key : state.text + key;
    state.at = now;
    const text = state.text.toLocaleLowerCase();
    const from = open ? active : selectedIndex;
    // A repeated single letter cycles through the matches instead of sticking.
    const start = text.length === 1 ? from + 1 : Math.max(from, 0);
    for (let step = 0; step < options.length; step++) {
      const index = (start + step) % options.length;
      if (options[index].label.toLocaleLowerCase().startsWith(text)) return index;
    }
    return -1;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    const current = open ? active : selectedIndex;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) show(Math.max(selectedIndex, 0));
        else setActive(Math.min(current + 1, last));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) show(Math.max(selectedIndex, 0));
        else setActive(Math.max(current - 1, 0));
        return;
      case "Home":
        event.preventDefault();
        show(0);
        return;
      case "End":
        event.preventDefault();
        show(last);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) commit(active);
        else show(Math.max(selectedIndex, 0));
        return;
      case "Escape":
        // Closing the list must not also close the modal around it.
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        return;
      case "Tab":
        if (open) commit(active);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const match = findTyped(event.key);
          if (match < 0) return;
          if (open) setActive(match);
          else if (options[match].value !== value) onChange(options[match].value);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : show(Math.max(selectedIndex, 0)))}
        onKeyDown={onKeyDown}
        className={`${trigger[size]} flex items-center justify-between gap-2 text-left focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 ${open ? "border-primary-500" : "enabled:hover:border-white/20"} ${className}`}
      >
        <span className={`truncate ${selected ? "" : "text-slate-500"}`}>{selected?.label ?? placeholder ?? " "}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-primary-400" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        popover="manual"
        tabIndex={-1}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : triggerId}
        className="select-popover fixed inset-auto m-0 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#0f1016] p-1 text-sm text-slate-200 shadow-xl shadow-black/40"
      >
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;
          const isActive = index === active;
          return (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              // Keeps focus on the trigger, where the keyboard handling lives.
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => { if (!isActive) setActive(index); }}
              onClick={() => commit(index)}
              className={`relative flex cursor-pointer items-center gap-3 rounded-lg py-2 pl-3 pr-2 transition-colors ${isSelected ? "text-primary-300" : ""} ${isActive ? "bg-white/5 text-white" : ""}`}
            >
              {isSelected && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary-500" />}
              <span className="truncate">{option.label}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`ml-auto h-4 w-4 shrink-0 text-primary-400 ${isSelected ? "" : "invisible"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </li>
          );
        })}
        {options.length === 0 && (
          <li role="presentation" className="px-3 py-2 italic text-slate-500">{placeholder}</li>
        )}
      </ul>
    </>
  );
}
