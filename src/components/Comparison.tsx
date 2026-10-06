import { useMemo, useState, type Dispatch } from "react";
import type { Action, TabId } from "../state";
import type { Desk, Setup } from "../lib/types";
import { buildInsights, type Insight } from "../lib/insights";
import { deskFit } from "../lib/setup";
import { deskSceneSvg, sharedScene } from "../lib/deskScene";
import { featureBadges, featureLosses } from "../lib/features";
import { setupTitle } from "../lib/setup";
import { Segmented } from "./Segmented";
import { Icon } from "./Icon";
import { ActualSize } from "./ActualSize";
import { ScreensView } from "./ScreensView";

interface Props {
  current: Setup;
  next: Setup;
  desk: Desk;
  tab: TabId;
  layout: "phone" | "laptop" | "wide";
  nextIsExample: boolean;
  /** Step through finder results without reopening the finder. */
  shortlist: { index: number; total: number; go: (index: number) => void } | null;
  dispatch: Dispatch<Action>;
}

const ALL_TABS: { value: TabId; label: string }[] = [
  { value: "workspace", label: "Workspace" },
  { value: "desk", label: "Desk fit" },
  { value: "ports", label: "Ports" },
  { value: "insights", label: "Insights" },
];

export function Comparison({ current, next, desk, tab, layout, nextIsExample, shortlist, dispatch }: Props) {
  // On wide screens ports and insights live in their own column, so the stage only needs two views.
  const tabs = layout === "wide" ? ALL_TABS.slice(0, 2) : ALL_TABS;
  const activeTab = tabs.some((t) => t.value === tab) ? tab : "workspace";
  const [actualOpen, setActualOpen] = useState(false);
  return (
    <section className="stage" aria-label="Comparison">
      <div className="stage-bar">
        <Segmented dark label="Comparison view" value={activeTab} options={tabs} onChange={(t) => dispatch({ type: "tab", tab: t })} />
        <button type="button" className="stage-button" onClick={() => setActualOpen(true)}>
          <Icon name="expand" />
          <span>Actual size</span>
        </button>
        {shortlist ? (
          <div className="shortlist-nav" aria-label="Finder results">
            <button type="button" className="round-button" aria-label="Previous recommendation" disabled={shortlist.index <= 0} onClick={() => shortlist.go(shortlist.index - 1)}>
              <Icon name="chevron" />
            </button>
            <span className="mono">Pick {shortlist.index + 1} of {shortlist.total}</span>
            <button type="button" className="round-button is-next" aria-label="Next recommendation" disabled={shortlist.index >= shortlist.total - 1} onClick={() => shortlist.go(shortlist.index + 1)}>
              <Icon name="chevron" />
            </button>
          </div>
        ) : (
          <span className="stage-note">Same physical scale · updates as you change anything</span>
        )}
      </div>
      <div className="stage-body" key={activeTab}>
        {activeTab === "workspace" && <ScreensView current={current} next={next} nextIsExample={nextIsExample} />}
        {activeTab === "desk" && <DeskView current={current} next={next} desk={desk} />}
        {activeTab === "ports" && <PortsView current={current} next={next} dark />}
        {activeTab === "insights" && <InsightsView current={current} next={next} desk={desk} dark />}
      </div>
      {actualOpen && <ActualSize current={current} next={next} onClose={() => setActualOpen(false)} />}
    </section>
  );
}

function DeskView({ current, next, desk }: { current: Setup; next: Setup; desk: Desk }) {
  const scene = sharedScene(current, next, desk);
  return (
    <div className="desk-view">
      {([[current, "current", "Current"], [next, "new", "New"]] as const).map(([setup, id, label]) => {
        const fit = deskFit(setup, desk);
        return (
          <article key={id} className={`desk-card${fit.over ? " is-over" : fit.tight ? " is-tight" : ""}`}>
            <span className={`kicker${id === "new" ? " is-accent" : ""}`}>{label}</span>
            <div className="desk-svg" dangerouslySetInnerHTML={{ __html: deskSceneSvg(setup, `scene-${id}`, `${label} setup`, scene, desk) }} />
            <p className="desk-result">
              <strong>
                {fit.width.toFixed(1)} cm wide · {fit.height.toFixed(1)} cm tall
              </strong>
              <span>{fit.parts.join(" · ")}</span>
            </p>
          </article>
        );
      })}
    </div>
  );
}

export function PortsView({ current, next, dark }: { current: Setup; next: Setup; dark?: boolean }) {
  const losses = featureLosses(current.primary.model, next.primary.model);
  return (
    <div className={`ports-view${dark ? " is-dark" : ""}`}>
      {([[current, "Current"], [next, "New"]] as const).map(([setup, label]) => {
        const models = setup.monitors.map((m) => m.model).filter((m, i, all) => m && all.indexOf(m) === i);
        return (
          <div key={label} className="ports-col">
            <span className={`kicker${label === "New" ? " is-accent" : ""}`}>{label} · {setupTitle(setup)}</span>
            {models.length === 0 && <p className="muted">Pick a model from the catalogue to see its ports and extras.</p>}
            {models.map((m) => {
              const badges = featureBadges(m);
              return (
                <div key={m!.id} className="chips">
                  {models.length > 1 && <span className="chips-title">{m!.model}</span>}
                  {badges.length === 0 ? <span className="muted">Ports not verified yet.</span> : badges.map((b) => <span key={b.text} className={`chip${b.kind === "warning" ? " is-warning" : ""}`}>{b.text}</span>)}
                </div>
              );
            })}
            {label === "New" && losses.length > 0 && (
              <div className="chips">
                {losses.map((l) => (
                  <span key={l} className="chip is-loss">No {l}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function InsightsView({ current, next, desk, dark }: { current: Setup; next: Setup; desk: Desk; dark?: boolean }) {
  const insights = useMemo(() => buildInsights(current, next, desk), [current, next, desk]);
  return (
    <div className={`insights${dark ? " is-dark" : ""}`}>
      {insights.map((i) => (
        <InsightCard key={i.kicker} insight={i} />
      ))}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className={`insight tone-${insight.tone}`}>
      <div className="insight-top">
        <span className="kicker">{insight.kicker}</span>
        <span className="insight-marker" aria-hidden="true">{insight.marker}</span>
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.body}</p>
    </article>
  );
}
