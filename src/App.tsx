import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { loadCatalogue } from "./lib/catalogue";
import { computeSetup, setupDeskWidthCM, setupTitle, workspaceLabel, clampDeskDepth, clampDeskHeight, clampDeskWidth, modelMetaText } from "./lib/setup";
import type { MonitorModel, Setup } from "./lib/types";
import { initialState, reducer } from "./state";
import { useLayout } from "./hooks";
import { Header } from "./components/Header";
import { StepCard } from "./components/StepCard";
import { SetupEditor } from "./components/SetupEditor";
import { DeskEditor } from "./components/DeskEditor";
import { Comparison, InsightsView, PortsView } from "./components/Comparison";
import { Stats } from "./components/Stats";
import { Icon } from "./components/Icon";

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [catalogue, setCatalogue] = useState<MonitorModel[]>([]);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const layout = useLayout();

  useEffect(() => {
    const controller = new AbortController();
    loadCatalogue(controller.signal)
      .then(setCatalogue)
      .catch((e: Error) => { if (e.name !== "AbortError") setCatalogueError(e.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const byId = useMemo(() => new Map(catalogue.map((m) => [m.id, m])), [catalogue]);
  const findModel = useCallback((id: string | null) => (id ? byId.get(id) ?? null : null), [byId]);
  const current = useMemo(() => computeSetup("current", state.current, findModel), [state.current, findModel]);
  const next = useMemo(() => computeSetup("new", state.next, findModel), [state.next, findModel]);
  const desk = useMemo(
    () => ({ width: clampDeskWidth(state.desk.width), depth: clampDeskDepth(state.desk.depth), shelf: clampDeskHeight(state.desk.shelf) }),
    [state.desk],
  );

  const toggle = (step: "current" | "new" | "desk") => dispatch({ type: "open", step: state.open === step ? null : step });
  const progress = state.doneNew ? 3 : state.doneCurrent ? 2 : 1;

  return (
    <div className={`app layout-${layout}`}>
      <Header progress={progress} />
      {catalogueError && (
        <div className="banner" role="status">
          The monitor catalogue didn't load ({catalogueError}). You can still compare by size and resolution.
        </div>
      )}
      <main className="workspace-grid">
        <aside className="rail" aria-label="Your setup">
          <StepCard
            id="step-current"
            badge={state.doneCurrent ? <Icon name="check" size={14} /> : "1"}
            badgeTone="green"
            kicker="Current setup"
            title={setupTitle(current)}
            summary={summaryText(current)}
            open={state.open === "current"}
            onToggle={() => toggle("current")}
          >
            <SetupEditor prefix="current" setup={state.current} catalogue={catalogue} loading={loading} findModel={findModel} dispatch={dispatch} />
            <button type="button" className="primary-button" onClick={() => dispatch({ type: "complete", step: "current" })}>
              {state.doneNew ? "Done" : "Continue to your upgrade"}
            </button>
          </StepCard>

          <StepCard
            id="step-new"
            badge="2"
            badgeTone="accent"
            kicker="Your upgrade"
            title={state.doneNew || state.next.primary.modelId ? setupTitle(next) : "Choose a monitor"}
            summary={state.doneNew || state.next.primary.modelId ? summaryText(next) : `Showing an example: ${setupTitle(next)}`}
            open={state.open === "new"}
            onToggle={() => toggle("new")}
          >
            <SetupEditor prefix="new" setup={state.next} catalogue={catalogue} loading={loading} findModel={findModel} dispatch={dispatch} />
            <button type="button" className="primary-button" onClick={() => dispatch({ type: "complete", step: "new" })}>
              See the difference
            </button>
          </StepCard>

          <StepCard
            id="step-desk"
            badge={<Icon name="desk" size={15} />}
            badgeTone="amber"
            kicker="Your desk"
            title={`${desk.width} × ${desk.depth} cm`}
            summary={desk.shelf ? `Shelf at ${desk.shelf} cm` : "No shelf above"}
            open={state.open === "desk"}
            onToggle={() => toggle("desk")}
          >
            <DeskEditor desk={state.desk} dispatch={dispatch} />
          </StepCard>
        </aside>

        <div className="stage-column">
          <Comparison current={current} next={next} desk={desk} tab={state.tab} layout={layout} nextIsExample={!state.doneNew && !state.next.primary.modelId} dispatch={dispatch} />
          <Stats current={current} next={next} />
        </div>

        {layout === "wide" && (
          <aside className="side" aria-label="Details">
            <section className="panel">
              <h2 className="panel-title">Insights</h2>
              <InsightsView current={current} next={next} desk={desk} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Ports &amp; features</h2>
              <PortsView current={current} next={next} />
            </section>
          </aside>
        )}
      </main>
    </div>
  );
}

function summaryText(setup: Setup): string {
  const parts: string[] = [];
  if (setup.mode === "dual") parts.push(workspaceLabel(setup));
  else if (setup.primary.model) parts.push(modelMetaText(setup.primary.model));
  else parts.push(`${setup.primary.size}" · ${setup.primary.nativePixelsX} × ${setup.primary.nativePixelsY}`);
  parts.push(`${setup.primary.scaling}% scaling`);
  parts.push(`${setupDeskWidthCM(setup).toFixed(1)} cm wide`);
  return parts.join(" · ");
}
