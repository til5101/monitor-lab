import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import type { Action, AppState } from "../state";
import type { Desk, MonitorModel, Screen, Setup } from "../lib/types";
import {
  countWithoutDeskFilter,
  featureRequirementsActive,
  findUpgrades,
  fitLabel,
  upgradeReason,
  type Preferences,
  type Recommendation,
  type SecondaryContext,
} from "../lib/finder";
import { modelMetaText, screenTitle } from "../lib/setup";
import { featureBadges } from "../lib/features";
import { Icon } from "./Icon";
import { HeartButton } from "./AccountUI";
import { DeskEditor } from "./DeskEditor";
import { SelectField } from "./SetupEditor";

interface Props {
  state: AppState;
  current: Setup;
  next: Setup;
  desk: Desk;
  catalogue: MonitorModel[];
  loading: boolean;
  secondary: SecondaryContext;
  dispatch: Dispatch<Action>;
  onChoose: (results: Recommendation[], index: number) => void;
}

const USES: { value: Preferences["useCase"]; label: string }[] = [
  { value: "mixed", label: "Mixed use" },
  { value: "productivity", label: "Work" },
  { value: "gaming", label: "Gaming" },
  { value: "creative", label: "Creative" },
];

const PRIORITIES: { value: Preferences["priority"]; label: string }[] = [
  { value: "balanced", label: "All-round" },
  { value: "workspace", label: "More workspace" },
  { value: "sharpness", label: "Sharper text" },
  { value: "refresh", label: "Higher refresh" },
  { value: "size", label: "Bigger screen" },
];

const PAGE = 24;

export function Finder({ state, current, next, desk, catalogue, loading, secondary, dispatch, onChoose }: Props) {
  const prefs = state.prefs;
  const dual = next.mode === "dual";
  const notSmaller = dual ? state.notSmallerDual : prefs.notSmaller;
  const effectivePrefs = useMemo(() => ({ ...prefs, notSmaller }), [prefs, notSmaller]);
  const [shown, setShown] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<Preferences>) => dispatch({ type: "prefs", patch });

  const results = useMemo(
    () => (catalogue.length ? findUpgrades(catalogue, current.primary, effectivePrefs, desk, secondary) : []),
    [catalogue, current.primary, effectivePrefs, desk, secondary],
  );
  const hiddenByDesk = useMemo(
    () => (effectivePrefs.fitDesk ? countWithoutDeskFilter(catalogue, current.primary, effectivePrefs, desk, secondary) - results.length : 0),
    [catalogue, current.primary, effectivePrefs, desk, secondary, results.length],
  );

  useEffect(() => {
    setShown(PAGE);
    listRef.current?.scrollTo({ top: 0 });
  }, [effectivePrefs, secondary]);

  const activeFilterCount =
    (prefs.size !== "any" ? 1 : 0) + (prefs.panel !== "any" ? 1 : 0) + (prefs.shape !== "any" ? 1 : 0) + (prefs.minimumRefresh > 0 ? 1 : 0) + (featureRequirementsActive(prefs) ? 1 : 0);

  return (
    <div className="finder" role="dialog" aria-modal="false" aria-labelledby="finder-title">
      <div className="finder-head">
        <div>
          <span className="kicker">Upgrade finder</span>
          <h2 id="finder-title">Monitors that beat your {screenTitle(current.primary)}</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Close finder" onClick={() => dispatch({ type: "finder", open: false })}>
          <Icon name="close" />
        </button>
      </div>

      <div className="finder-scroll" ref={listRef}>
        <div className="finder-controls">
          <ChipGroup label="Mostly used for" value={prefs.useCase} options={USES} onChange={(useCase) => set({ useCase })} />
          <ChipGroup label="What matters most" value={prefs.priority} options={PRIORITIES} onChange={(priority) => set({ priority })} />

          {dual && <SecondaryChoice state={state} current={current} dispatch={dispatch} />}

          <label className="check">
            <input
              type="checkbox"
              checked={notSmaller}
              onChange={(e) => (dual ? dispatch({ type: "notSmallerDual", value: e.target.checked }) : set({ notSmaller: e.target.checked }))}
            />
            <span>
              <strong>{dual ? "Keep the new main screen at least as large" : "Don't suggest a smaller main screen"}</strong>
              <small>{dual ? "Off by default, because dual setups often swap one big screen for two smaller ones." : `Nothing under ${current.primary.size}".`}</small>
            </span>
          </label>

          <details className="finder-section" open={filtersOpen} onToggle={(e) => setFiltersOpen((e.target as HTMLDetailsElement).open)}>
            <summary>
              More filters{activeFilterCount > 0 && <span className="count-pill">{activeFilterCount}</span>}
              <Icon name="chevron" />
            </summary>
            <div className="finder-section-body">
              <div className="grid-2">
                <SelectField label="Size" value={prefs.size} onChange={(v) => set({ size: v as Preferences["size"] })} options={[
                  { value: "any", label: "No preference" },
                  { value: "similar", label: "Similar to mine" },
                  { value: "27", label: 'Around 27"' },
                  { value: "32", label: 'Around 32"' },
                  { value: "ultrawide", label: '34"+ ultrawide' },
                  { value: "large", label: '40"+ large' },
                ]} />
                <SelectField label="Panel" value={prefs.panel} onChange={(v) => set({ panel: v as Preferences["panel"] })} options={[
                  { value: "any", label: "No preference" },
                  { value: "ips", label: "IPS / Fast IPS" },
                  { value: "oled", label: "OLED / QD-OLED" },
                  { value: "va", label: "VA" },
                ]} />
                <SelectField label="Shape" value={prefs.shape} onChange={(v) => set({ shape: v as Preferences["shape"] })} options={[
                  { value: "any", label: "Flat or curved" },
                  { value: "flat", label: "Flat only" },
                  { value: "curved", label: "Curved only" },
                ]} />
                <SelectField label="Refresh rate" value={String(prefs.minimumRefresh)} onChange={(v) => set({ minimumRefresh: Number(v) })} options={[0, 100, 120, 144, 165, 200, 240].map((r) => ({ value: String(r), label: r ? `${r}Hz+` : "No minimum" }))} />
                <SelectField label="HDMI ports" value={String(prefs.minimumHdmi)} onChange={(v) => set({ minimumHdmi: Number(v) })} options={[0, 1, 2].map((n) => ({ value: String(n), label: n ? `At least ${n}` : "No requirement" }))} />
                <SelectField label="DisplayPort" value={String(prefs.minimumDisplayport)} onChange={(v) => set({ minimumDisplayport: Number(v) })} options={[0, 1, 2].map((n) => ({ value: String(n), label: n ? `At least ${n}` : "No requirement" }))} />
                <SelectField label="USB-C charging" value={String(prefs.minimumUsbCPower)} onChange={(v) => set({ minimumUsbCPower: Number(v) })} options={[0, 45, 65, 90, 100].map((n) => ({ value: String(n), label: n ? `${n}W+` : "No requirement" }))} />
              </div>
              <div className="toggle-chips" role="group" aria-label="Must have">
                {([
                  ["usbCVideo", "USB-C video"],
                  ["thunderbolt", "Thunderbolt"],
                  ["displayportOut", "DP daisy-chain"],
                  ["usbHub", "USB hub"],
                  ["ethernet", "Ethernet"],
                  ["kvm", "KVM"],
                  ["speakers", "Speakers"],
                  ["webcam", "Webcam"],
                  ["microphone", "Microphone"],
                  ["audioOut", "Audio out"],
                ] as const).map(([key, label]) => (
                  <button key={key} type="button" className="toggle-chip" aria-pressed={prefs[key]} onClick={() => set({ [key]: !prefs[key] } as Partial<Preferences>)}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="hint">Port filters only match models whose ports we've verified.</p>
            </div>
          </details>

          <details className="finder-section">
            <summary>
              Desk fit · {desk.width} × {desk.depth} cm{desk.shelf ? ` · shelf ${desk.shelf} cm` : ""}
              <Icon name="chevron" />
            </summary>
            <div className="finder-section-body">
              <DeskEditor desk={state.desk} dispatch={dispatch} />
              <label className="check">
                <input type="checkbox" checked={prefs.fitDesk} onChange={(e) => set({ fitDesk: e.target.checked })} />
                <span>
                  <strong>Hide setups that won't fit</strong>
                  <small>Off by default. Every result still shows whether it fits.</small>
                </span>
              </label>
            </div>
          </details>
        </div>

        <div className="finder-results" aria-live="polite">
          <p className="result-count">
            {loading ? "Loading catalogue…" : (
              <>
                <strong className="mono">{results.length}</strong> {results.length === 1 ? "monitor matches" : "monitors match"}
                {hiddenByDesk > 0 && (
                  <>
                    {" "}· {hiddenByDesk} more won't fit your desk.{" "}
                    <button type="button" className="text-button inline" onClick={() => set({ fitDesk: false })}>Show them</button>
                  </>
                )}
              </>
            )}
          </p>
          {!loading && results.length === 0 && (
            <div className="empty">
              <strong>Nothing matches all of that.</strong>
              <span>{prefs.fitDesk ? "The desk-fit filter may be hiding good options." : "Try relaxing the size, refresh, panel or port filters."}</span>
            </div>
          )}
          <ol className="result-list">
            {results.slice(0, shown).map((item, i) => (
              <ResultCard
                key={item.model.id}
                item={item}
                rank={i + 1}
                current={current.primary}
                prefs={effectivePrefs}
                desk={desk}
                secondary={secondary}
                selected={state.shortlist[state.shortlistIndex] === item.model.id}
                onChoose={() => onChoose(results, i)}
              />
            ))}
          </ol>
          {shown < results.length && (
            <button type="button" className="secondary-button" onClick={() => setShown((s) => s + PAGE)}>
              Show {Math.min(PAGE, results.length - shown)} more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="chip-group" role="radiogroup" aria-label={label}>
      <span className="field-label">{label}</span>
      <div className="chip-row">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="choice-chip" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SecondaryChoice({ state, current, dispatch }: { state: AppState; current: Setup; dispatch: Dispatch<Action> }) {
  const plan = state.finderSecondary.plan;
  const sources = current.monitors.map((m) => ({ value: m.slot, label: `${m.slot === "primary" ? "Main" : "Second"} screen · ${screenTitle(m)}` }));
  return (
    <div className="secondary-choice">
      <span className="field-label">Second screen</span>
      <div className="chip-row">
        <button type="button" className="choice-chip" aria-checked={plan === "keep"} role="radio" onClick={() => dispatch({ type: "finderSecondary", patch: { plan: "keep" } })}>
          Keep one I own
        </button>
        <button type="button" className="choice-chip" aria-checked={plan === "configure"} role="radio" onClick={() => dispatch({ type: "finderSecondary", patch: { plan: "configure" } })}>
          Buy another
        </button>
      </div>
      {plan === "keep" && sources.length > 1 && (
        <SelectField label="Which one?" value={state.finderSecondary.source} options={sources} onChange={(v) => dispatch({ type: "finderSecondary", patch: { source: v as "primary" | "secondary" } })} />
      )}
      {plan === "keep" && sources.length === 1 && <p className="hint">Your {screenTitle(current.primary)} goes beside the new screen.</p>}
      {plan === "configure" && (
        <label className="check">
          <input type="checkbox" checked={state.pairNew} onChange={(e) => dispatch({ type: "pairNew", value: e.target.checked })} />
          <span>
            <strong>Recommend a matching pair</strong>
            <small>{state.pairNew ? "One model, used twice. Desk fit counts both." : "Uses the second screen set in step 2."}</small>
          </span>
        </label>
      )}
    </div>
  );
}

interface ResultCardProps {
  item: Recommendation;
  rank: number;
  current: Screen;
  prefs: Preferences;
  desk: Desk;
  secondary: SecondaryContext;
  selected: boolean;
  onChoose: () => void;
}

function ResultCard({ item, rank, current, prefs, desk, secondary, selected, onChoose }: ResultCardProps) {
  const fit = fitLabel(item, desk, secondary);
  const workspace = Math.round(item.workspaceGain * 100);
  const badges = featureBadges(item.model, 3);
  return (
    <li className={`result${selected ? " is-selected" : ""}`}>
      <div className="result-main">
        <div className="result-title">
          {rank === 1 && <span className="top-pick">Top pick</span>}
          <strong>{item.model.brand} {item.model.model}</strong>
          <span className="result-meta">{modelMetaText(item.model)}</span>
        </div>
        <p className="result-reason">{upgradeReason(item, current, prefs)}</p>
        <div className="result-tags">
          <span className={`tag ${fit.over ? "is-bad" : fit.tight ? "is-warn" : "is-good"}`}>{fit.text}</span>
          <span className="tag">{workspace >= 0 ? "+" : ""}{workspace}% workspace</span>
          <span className="tag">{Math.round(item.metrics.ppi)} PPI</span>
          {badges.map((b) => <span key={b.text} className="tag is-plain">{b.text}</span>)}
        </div>
      </div>
      <div className="result-actions">
        <button type="button" className={selected ? "compare-button is-selected" : "compare-button"} onClick={onChoose} aria-label={`Compare ${item.model.brand} ${item.model.model}`}>
          {selected ? "Comparing" : "Compare"}
        </button>
        <HeartButton model={item.model} />
      </div>
    </li>
  );
}
