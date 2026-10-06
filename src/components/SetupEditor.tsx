import type { Dispatch } from "react";
import type { Action } from "../state";
import type { MonitorModel, Prefix, ScreenInput, SetupInput, Slot } from "../lib/types";
import { RESOLUTION_OPTIONS, SCALING_OPTIONS, SIZE_OPTIONS, resolutionOptionLabel } from "../lib/setup";
import { ModelSearch } from "./ModelSearch";
import { Segmented } from "./Segmented";

interface Props {
  prefix: Prefix;
  setup: SetupInput;
  catalogue: MonitorModel[];
  loading: boolean;
  findModel: (id: string | null) => MonitorModel | null;
  dispatch: Dispatch<Action>;
}

export function SetupEditor({ prefix, setup, catalogue, loading, findModel, dispatch }: Props) {
  return (
    <div className="editor">
      <Segmented
        label="Number of screens"
        value={setup.mode}
        options={[{ value: "single", label: "Single monitor" }, { value: "dual", label: "Dual monitor" }]}
        onChange={(mode) => dispatch({ type: "mode", prefix, mode })}
      />
      <ScreenFields
        prefix={prefix}
        slot="primary"
        title={setup.mode === "dual" ? "Main screen" : null}
        input={setup.primary}
        catalogue={catalogue}
        loading={loading}
        findModel={findModel}
        dispatch={dispatch}
      />
      <div className="fold" data-open={setup.mode === "dual"} inert={setup.mode !== "dual"}>
        <div>
          <div className="secondary">
            <ScreenFields
              prefix={prefix}
              slot="secondary"
              title="Second screen"
              input={setup.secondary}
              catalogue={catalogue}
              loading={loading}
              findModel={findModel}
              dispatch={dispatch}
            />
            <div className="grid-2">
              <SelectField
                label="Orientation"
                value={setup.secondary.orientation}
                options={[{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }]}
                onChange={(v) => dispatch({ type: "screen", prefix, slot: "secondary", patch: { orientation: v as ScreenInput["orientation"] } })}
              />
              <SelectField
                label="Sits on the"
                value={setup.position}
                options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]}
                onChange={(v) => dispatch({ type: "position", prefix, position: v as SetupInput["position"] })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScreenFieldsProps {
  prefix: Prefix;
  slot: Slot;
  title: string | null;
  input: ScreenInput;
  catalogue: MonitorModel[];
  loading: boolean;
  findModel: (id: string | null) => MonitorModel | null;
  dispatch: Dispatch<Action>;
}

function ScreenFields({ prefix, slot, title, input, catalogue, loading, findModel, dispatch }: ScreenFieldsProps) {
  const model = findModel(input.modelId);
  const set = (patch: Partial<ScreenInput>) => dispatch({ type: "screen", prefix, slot, patch });
  const sizes = withValue(SIZE_OPTIONS, input.size);
  const resolutions = withValue(RESOLUTION_OPTIONS, input.resolution);
  return (
    <div className="screen-fields">
      {title && <span className="sub-title">{title}</span>}
      <ModelSearch
        label={slot === "primary" && prefix === "current" ? "Your monitor" : prefix === "new" && slot === "primary" ? "Monitor you're considering" : "Model"}
        catalogue={catalogue}
        loading={loading}
        selected={model}
        onSelect={(m) => set({ modelId: m.id, size: m.size, resolution: m.resolution })}
        onClear={() => set({ modelId: null })}
        placeholder={prefix === "current" ? "Try AOC 27G4HRE or Dell U3223QE" : undefined}
      />
      <div className="grid-3">
        <SelectField
          label="Size"
          value={String(input.size)}
          disabled={!!model}
          options={sizes.map((s) => ({ value: String(s), label: `${s}"` }))}
          onChange={(v) => set({ size: Number(v) })}
        />
        <SelectField
          label="Resolution"
          value={input.resolution}
          disabled={!!model}
          options={resolutions.map((r) => ({ value: r, label: resolutionOptionLabel(r) }))}
          onChange={(v) => set({ resolution: v })}
        />
        <SelectField
          label="Windows scaling"
          value={String(input.scaling)}
          options={SCALING_OPTIONS.map((s) => ({ value: String(s), label: `${s}%` }))}
          onChange={(v) => set({ scaling: Number(v) })}
        />
      </div>
      {!model && <p className="hint">Can't find it? Pick the size and resolution instead.</p>}
    </div>
  );
}

function withValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value].sort((a, b) => (typeof a === "number" ? (a as number) - (b as unknown as number) : 0));
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectField({ label, value, options, onChange, disabled }: SelectFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="select">
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
