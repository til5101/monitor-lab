import type { MonitorModel, Setup } from "../lib/types";
import { extras, laptopLink, portChanges, portGroups, type Extra, type PortKind } from "../lib/ports";
import { modelMetaText, setupTitle } from "../lib/setup";
import { Thumb } from "./Thumb";

/** The back panel of each monitor, drawn port by port, with laptop connection and built-in extras. */
export function PortsView({ current, next, dark }: { current: Setup; next: Setup; dark?: boolean }) {
  const changes = portChanges(current.primary.model, next.primary.model);
  return (
    <div className={`ports-view${dark ? " is-dark" : ""}`}>
      {changes && (
        <div className="port-changes" aria-label="What changes with the new monitor">
          <span className="port-changes-title">With the new monitor</span>
          {changes.length === 0 ? (
            <span className="port-change">Same connections as now</span>
          ) : (
            changes.map((c) => <span key={c.text} className={`port-change is-${c.tone}`}>{c.text}</span>)
          )}
        </div>
      )}
      {([[current, "Current"], [next, "New"]] as const).map(([setup, label]) => {
        const models = setup.monitors.map((m) => m.model).filter((m, i, all): m is MonitorModel => !!m && all.indexOf(m) === i);
        return (
          <section key={label} className="ports-col" aria-label={`${label} setup ports`}>
            <span className={`kicker${label === "New" ? " is-accent" : ""}`}>{label} · {setupTitle(setup)}</span>
            {models.length === 0 && (
              <div className="port-card is-empty">
                <RearPanel model={null} />
                <p className="muted">Pick a model from the catalogue to see its ports and extras.</p>
              </div>
            )}
            {models.map((m) => <PortCard key={m.id} model={m} />)}
          </section>
        );
      })}
    </div>
  );
}

function PortCard({ model }: { model: MonitorModel }) {
  if (!model.featuresVerified) {
    return (
      <div className="port-card">
        <CardHead model={model} />
        <RearPanel model={null} />
        <p className="muted">We haven't verified this model's ports yet.</p>
      </div>
    );
  }
  const link = laptopLink(model);
  return (
    <div className="port-card">
      <CardHead model={model} />
      <RearPanel model={model} />
      <p className={`laptop-link${link.oneCable ? " is-yes" : ""}`}>
        <LaptopIcon />
        <span>{link.text}</span>
      </p>
      <ul className="extras">
        {extras(model).map((e) => <ExtraTile key={e.key} extra={e} />)}
      </ul>
    </div>
  );
}

function CardHead({ model }: { model: MonitorModel }) {
  return (
    <div className="port-card-head">
      <Thumb model={model} />
      <div>
        <strong>{model.brand} {model.model}</strong>
        <span>{modelMetaText(model)}</span>
      </div>
    </div>
  );
}

function RearPanel({ model }: { model: MonitorModel | null }) {
  const groups = model ? portGroups(model) : [];
  return (
    <div className={`rear-panel${model ? "" : " is-blank"}`} role="img" aria-label={model ? `Ports: ${groups.map((g) => `${g.count} ${g.label}${g.detail ? ` ${g.detail}` : ""}`).join(", ")}` : "Ports unknown"}>
      {groups.map((g) => (
        <div key={g.kind} className={`port-group${g.video ? " is-video" : ""}`}>
          <div className="port-glyphs">
            {Array.from({ length: Math.min(g.count, 6) }, (_, i) => <PortGlyph key={i} kind={g.kind} />)}
          </div>
          <span className="port-label">
            {g.count > 1 ? `${g.count}× ` : ""}{g.label}
          </span>
          {g.detail && <span className="port-detail">{g.detail}</span>}
        </div>
      ))}
      {!model && <span className="rear-blank">?</span>}
    </div>
  );
}

function PortGlyph({ kind }: { kind: PortKind }) {
  const shape = (() => {
    switch (kind) {
      case "hdmi": return <path d="M3 5h26v6l-4 4H7l-4-4z" />;
      case "dp": case "dpout": return <path d="M3 5h26v10H8l-5-5z" />;
      case "usbc": return <rect x="5" y="6" width="22" height="8" rx="4" />;
      case "tb": return <><rect x="5" y="6" width="22" height="8" rx="4" /><path className="glyph-mark" d="M17 2l-4 5h3l-2 4" /></>;
      case "usba": return <><rect x="5" y="5" width="22" height="10" rx="1" /><rect className="glyph-fill" x="8" y="8" width="16" height="3" /></>;
      case "usbb": return <><path d="M9 3h14l4 4v10H5V7z" /><rect className="glyph-fill" x="11" y="8" width="10" height="5" /></>;
      case "rj45": return <path d="M7 3h18v11h-5v3h-8v-3H7z" />;
      case "audio": return <><circle cx="16" cy="10" r="6" /><circle className="glyph-fill" cx="16" cy="10" r="2" /></>;
    }
  })();
  return (
    <svg className={`port-glyph is-${kind}`} viewBox="0 0 32 20" aria-hidden="true">
      {shape}
      {kind === "dpout" && <path className="glyph-mark" d="M24 2h5v5M29 2l-5 5" />}
    </svg>
  );
}

function ExtraTile({ extra }: { extra: Extra }) {
  return (
    <li className={`extra${extra.on ? " is-on" : ""}`} title={extra.detail || undefined}>
      <ExtraIcon kind={extra.key} />
      <span className="extra-label">{extra.label}</span>
      <span className="extra-detail">{extra.on ? extra.detail || "Yes" : "No"}</span>
    </li>
  );
}

function ExtraIcon({ kind }: { kind: Extra["key"] }) {
  const d: Record<Extra["key"], string> = {
    kvm: "M3 5h8v6H3zM13 5h8v6h-8zM7 11v3h10v-3M12 14v5M8 19h8",
    ethernet: "M6 4h12v10h-4v3h-4v-3H6zM9 7v3M12 7v3M15 7v3",
    speakers: "M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11",
    webcam: "M12 3a6 6 0 1 0 0 12a6 6 0 0 0 0-12zM12 7a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM8 21h8M12 15v6",
    microphone: "M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3",
    vesa: "M4 4h16v16H4zM8 8h.01M16 8h.01M8 16h.01M16 16h.01",
  };
  return (
    <svg className="extra-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d[kind]} />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg className="laptop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5h14v10H5zM2 19h20" />
    </svg>
  );
}
