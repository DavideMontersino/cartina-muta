import { useEffect, useId, useRef, useState } from "react";
import { filterProvinces } from "../maps/filter";
import { PROVINCES } from "../maps/registry";
import type { ProvinceMeta } from "../maps/types";

interface ProvinceSearchProps {
  onSelect: (id: string) => void;
}

/** Accessible combobox to search a province by name, region, or 2-letter code. */
export function ProvinceSearch({ onSelect }: ProvinceSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const results = filterProvinces(PROVINCES, query, 8);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (p: ProvinceMeta) => {
    setQuery("");
    setOpen(false);
    setActive(0);
    onSelect(p.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="search" ref={rootRef}>
      <input
        type="text"
        className="signin__input search__input"
        placeholder="Cerca una provincia…"
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: standard ARIA combobox pattern — the popup list must be a listbox.
        <ul className="search__list" id={listId} role="listbox">
          {results.map((p, i) => (
            <li key={p.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`search__opt ${i === active ? "search__opt--active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  // Prevent input blur before the click registers.
                  e.preventDefault();
                  choose(p);
                }}
              >
                <span className="search__name">{p.name}</span>
                <span className="search__meta">
                  {p.region} · {p.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
