import { useEffect, useState, type Dispatch } from "react";
import type { Action } from "../state";
import type { Desk } from "../lib/types";
import { clampDeskDepth, clampDeskHeight, clampDeskWidth } from "../lib/setup";

export function DeskEditor({ desk, dispatch }: { desk: Desk; dispatch: Dispatch<Action> }) {
  return (
    <div className="grid-3 desk-inputs">
      <NumberField label="Width" unit="cm" value={desk.width} min={60} max={300} clamp={clampDeskWidth} onChange={(v) => dispatch({ type: "desk", patch: { width: v ?? 140 } })} />
      <NumberField label="Depth" unit="cm" value={desk.depth} min={30} max={150} clamp={clampDeskDepth} onChange={(v) => dispatch({ type: "desk", patch: { depth: v ?? 70 } })} />
      <NumberField label="Shelf" unit="cm" optional value={desk.shelf} min={20} max={200} clamp={(v) => clampDeskHeight(v)} onChange={(v) => dispatch({ type: "desk", patch: { shelf: v } })} />
      <p className="hint span-3">Depth is front to back. Shelf is the clear height from the desktop to anything above it.</p>
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  unit: string;
  value: number | null;
  min: number;
  max: number;
  optional?: boolean;
  clamp: (v: number) => number | null;
  onChange: (v: number | null) => void;
}

/** Updates live while typing; snaps into range when you leave the field. */
function NumberField({ label, unit, value, min, max, optional, clamp, onChange }: NumberFieldProps) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => setText(value === null ? "" : String(value)), [value]);
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="number-input">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          placeholder={optional ? "Optional" : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = e.target.value === "" ? null : Number(e.target.value);
            if (n === null) { if (optional) onChange(null); return; }
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => {
            if (text === "") { onChange(optional ? null : clamp(0)); return; }
            const clamped = clamp(Number(text));
            onChange(clamped);
            setText(clamped === null ? "" : String(clamped));
          }}
        />
        <span className="unit">{unit}</span>
      </span>
    </label>
  );
}
