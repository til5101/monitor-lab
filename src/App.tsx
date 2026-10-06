import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { loadCatalogue } from "./lib/catalogue";
import { clampDeskDepth, clampDeskHeight, clampDeskWidth, computeSetup, modelMetaText, setupDeskWidthCM, setupTitle, workspaceLabel } from "./lib/setup";
import { recommendedScaling, type Recommendation, type SecondaryContext } from "./lib/finder";
import type { MonitorModel, ScreenInput, Setup, SetupInput } from "./lib/types";
import { initialState, reducer, type AppState } from "./state";
import { buildShareUrl, readShareParams } from "./lib/share";
import { useLayout } from "./hooks";
import { Header } from "./components/Header";
import { StepCard } from "./components/StepCard";
import { SetupEditor } from "./components/SetupEditor";
import { DeskEditor } from "./components/DeskEditor";
import { Comparison, InsightsView, PortsView } from "./components/Comparison";
import { Stats } from "./components/Stats";
import { Finder } from "./components/Finder";
import { Icon } from "./components/Icon";
import { AccountButton, Notice, SavedPanel, SignInDialog } from "./components/AccountUI";

/** With a matching pair, the second screen mirrors the main one (keeping its own orientation). */
function effectiveNext(state: AppState): SetupInput {
  if (state.next.mode !== "dual" || !state.pairNew) return state.next;
  return { ...state.next, secondary: { ...state.next.primary, orientation: state.next.secondary.orientation } };
}

const sameScreen = (a: ScreenInput, b: ScreenInput) => a.modelId === b.modelId && a.size === b.size && a.resolution === b.resolution && a.scaling === b.scaling;

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState, (base) => {
    const shared = typeof window !== "undefined" ? readShareParams(window.location.search, base) : null;
    return shared ? { ...base, ...shared } : base;
  });
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
  const nextInput = useMemo(() => effectiveNext(state), [state.next, state.pairNew]);
  const current = useMemo(() => computeSetup("current", state.current, findModel), [state.current, findModel]);
  const next = useMemo(() => computeSetup("new", nextInput, findModel), [nextInput, findModel]);
  const desk = useMemo(
    () => ({ width: clampDeskWidth(state.desk.width), depth: clampDeskDepth(state.desk.depth), shelf: clampDeskHeight(state.desk.shelf) }),
    [state.desk],
  );

  // Finder, dual upgrade, "keep one I own": the kept screen becomes the new setup's second screen.
  const keepSource = state.finderOpen && state.next.mode === "dual" && state.finderSecondary.plan === "keep"
    ? state.current[state.current.mode === "dual" ? state.finderSecondary.source : "primary"]
    : null;
  useEffect(() => {
    if (!keepSource) return;
    if (state.pairNew) dispatch({ type: "pairNew", value: false });
    if (!sameScreen(keepSource, state.next.secondary)) {
      dispatch({ type: "screen", prefix: "new", slot: "secondary", patch: { modelId: keepSource.modelId, size: keepSource.size, resolution: keepSource.resolution, scaling: keepSource.scaling } });
    }
  }, [keepSource, state.next.secondary, state.pairNew]);

  const secondaryContext: SecondaryContext = useMemo(() => {
    if (next.mode !== "dual") return { kind: "none" };
    if (state.pairNew) return { kind: "pair", orientation: state.next.secondary.orientation };
    const screen = next.monitors.find((m) => m.slot === "secondary");
    return screen ? { kind: "screen", screen } : { kind: "none" };
  }, [next, state.pairNew, state.next.secondary.orientation]);

  const applyModel = useCallback(
    (ids: string[], index: number) => {
      const model = findModel(ids[index]);
      if (!model) return;
      const primary: ScreenInput = { modelId: model.id, size: model.size, resolution: model.resolution, scaling: recommendedScaling(model), orientation: "landscape" };
      dispatch({ type: "chooseRecommendation", ids, index, primary });
    },
    [findModel],
  );

  const chooseFromFinder = (results: Recommendation[], index: number) => {
    applyModel(results.map((r) => r.model.id), index);
    dispatch({ type: "finder", open: false });
  };

  const [savedOpen, setSavedOpen] = useState(false);
  const shareQuery = () => new URL(buildShareUrl(state, window.location.origin)).search.replace(/^\?/, "");
  const openSavedSetup = (params: string) => {
    const restored = readShareParams(`?${params}`, initialState);
    if (restored) dispatch({ type: "replace", state: { ...restored, shortlist: [], shortlistIndex: -1, finderOpen: false } });
  };
  const useSavedMonitor = (model: MonitorModel) => {
    const primary: ScreenInput = { modelId: model.id, size: model.size, resolution: model.resolution, scaling: recommendedScaling(model), orientation: "landscape" };
    dispatch({ type: "chooseRecommendation", ids: [model.id], index: 0, primary });
  };

  const toggle = (step: "current" | "new" | "desk") => dispatch({ type: "open", step: state.open === step ? null : step });
  const progress = state.doneNew ? 3 : state.doneCurrent ? 2 : 1;
  const nextChosen = state.doneNew || !!state.next.primary.modelId;

  return (
    <div className={`app layout-${layout}`}>
      <Header
        progress={progress}
        shareUrl={() => buildShareUrl(state, window.location.origin)}
        canShare={state.doneCurrent}
        account={<AccountButton onOpenSaved={() => setSavedOpen(true)} />}
      />
      {catalogueError && (
        <div className="banner" role="status">
          The monitor catalogue didn't load ({catalogueError}). You can still compare by size and resolution.
        </div>
      )}
      <main className="workspace-grid">
        <div className="rail-wrap">
          <aside className="rail" aria-label="Your setup" inert={state.finderOpen && layout !== "phone"}>
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
              title={nextChosen ? setupTitle(next) : "Choose a monitor"}
              summary={nextChosen ? summaryText(next) : `Showing an example: ${setupTitle(next)}`}
              open={state.open === "new"}
              onToggle={() => toggle("new")}
            >
              <SetupEditor
                prefix="new"
                setup={state.next}
                catalogue={catalogue}
                loading={loading}
                findModel={findModel}
                dispatch={dispatch}
                pair={state.pairNew}
                onPairChange={(value) => dispatch({ type: "pairNew", value })}
                afterMode={
                  <button type="button" className="finder-launch" onClick={() => dispatch({ type: "finder", open: true })}>
                    <span>
                      <strong>Not sure what to get?</strong>
                      <small>Find upgrades ranked against your {setupTitle(current)}.</small>
                    </span>
                    <span className="finder-launch-cta">Find one for me →</span>
                  </button>
                }
              />
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

            {!state.finderOpen && (
              <button type="button" className="finder-cta" onClick={() => dispatch({ type: "finder", open: true })}>
                <Icon name="search" />
                <span>
                  <strong>Find my upgrade</strong>
                  <small>Ranked against your current setup</small>
                </span>
              </button>
            )}
          </aside>
          <div className="finder-layer" data-open={state.finderOpen}>
            {state.finderOpen && (
              <Finder
                state={state}
                current={current}
                next={next}
                desk={desk}
                catalogue={catalogue}
                loading={loading}
                secondary={secondaryContext}
                dispatch={dispatch}
                onChoose={chooseFromFinder}
              />
            )}
          </div>
        </div>

        <div className="stage-column">
          <Comparison
            current={current}
            next={next}
            desk={desk}
            tab={state.tab}
            layout={layout}
            nextIsExample={!nextChosen}
            shortlist={state.shortlist.length > 1 ? { index: state.shortlistIndex, total: state.shortlist.length, go: (i) => applyModel(state.shortlist, i) } : null}
            saveParams={shareQuery}
            dispatch={dispatch}
          />
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
      <SavedPanel open={savedOpen} onClose={() => setSavedOpen(false)} catalogue={catalogue} onUseMonitor={useSavedMonitor} onOpenSetup={openSavedSetup} />
      <SignInDialog />
      <Notice />
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
