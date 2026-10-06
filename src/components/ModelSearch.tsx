import { useId, useMemo, useRef, useState } from "react";
import { searchCatalogue } from "../lib/catalogue";
import { modelMetaText } from "../lib/setup";
import type { MonitorModel } from "../lib/types";
import { Icon } from "./Icon";
import { HeartButton } from "./AccountUI";
import { Thumb } from "./Thumb";

interface Props {
  label: string;
  catalogue: MonitorModel[];
  loading: boolean;
  selected: MonitorModel | null;
  onSelect: (model: MonitorModel) => void;
  onClear: () => void;
  placeholder?: string;
}

/** Type-ahead search over the catalogue. Arrow keys move, Enter picks, Escape closes. */
export function ModelSearch({ label, catalogue, loading, selected, onSelect, onClear, placeholder }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (query.trim() ? searchCatalogue(catalogue, query) : []), [catalogue, query]);

  function pick(model: MonitorModel) {
    onSelect(model);
    setQuery("");
    setOpen(false);
  }

  if (selected) {
    return (
      <div className="field">
        <span className="field-label">{label}</span>
        <div className="picked">
          <Thumb model={selected} />
          <div className="picked-copy">
            <strong>
              {selected.brand} {selected.model}
            </strong>
            <span>{modelMetaText(selected)}</span>
          </div>
          <HeartButton model={selected} />
          <button type="button" className="text-button" onClick={() => { onClear(); requestAnimationFrame(() => inputRef.current?.focus()); }}>
            Change
          </button>
        </div>
      </div>
    );
  }

  const showList = open && query.trim().length > 0;
  return (
    <div className="field search">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="search-box">
        <Icon name="search" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={loading ? "Loading catalogue…" : placeholder ?? `Search ${catalogue.length} monitors`}
          value={query}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-activedescendant={showList && results[active] ? `${id}-${results[active].id}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>
      {showList && (
        <ul className="search-results" id={`${id}-list`} role="listbox">
          {results.length === 0 && <li className="search-empty">No match. Enter the size and resolution below instead.</li>}
          {results.map((m, i) => (
            <li
              key={m.id}
              id={`${id}-${m.id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "is-active" : undefined}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(m); }}
            >
              <Thumb model={m} size="sm" />
              <span className="search-copy">
                <strong>
                  {m.brand} {m.model}
                </strong>
                <span>{modelMetaText(m)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
