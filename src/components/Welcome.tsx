import { useEffect, useState } from "react";
import type { MonitorModel } from "../lib/types";
import { Logo } from "./Icon";
import { ModelSearch } from "./ModelSearch";

const SEEN_KEY = "monitorLabWelcomedV1";

/** First visit only: not for shared links, sign-in links or anyone who has dismissed it before. */
export function shouldShowWelcome(): boolean {
  if (typeof window === "undefined") return false;
  if (/[?&]ml_/.test(window.location.search)) return false;
  if (/access_token=|error=/.test(window.location.hash)) return false;
  try {
    return localStorage.getItem(SEEN_KEY) === null;
  } catch {
    return true;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* fine: it just shows again next visit */
  }
}

// Common upgrades, drawn to scale against each other.
const EXAMPLES = [
  { from: { size: 24, ratio: 16 / 9, name: "24-inch" }, to: { size: 27, ratio: 16 / 9, name: "27-inch" } },
  { from: { size: 27, ratio: 16 / 9, name: "27-inch" }, to: { size: 32, ratio: 16 / 9, name: "32-inch" } },
  { from: { size: 27, ratio: 16 / 9, name: "27-inch" }, to: { size: 34, ratio: 21 / 9, name: "34-inch ultrawide" } },
];

function dims(size: number, ratio: number) {
  const h = size / Math.sqrt(1 + ratio * ratio);
  return { w: h * ratio, h };
}

interface Props {
  catalogue: MonitorModel[];
  loading: boolean;
  onPickCurrent: (model: MonitorModel) => void;
  onManual: () => void;
  onClose: () => void;
}

export function Welcome({ catalogue, loading, onPickCurrent, onManual, onClose }: Props) {
  const [leaving, setLeaving] = useState(false);
  const finish = (then: () => void) => {
    markWelcomeSeen();
    setLeaving(true);
    window.setTimeout(then, 220);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish(onClose);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`welcome${leaving ? " is-leaving" : ""}`} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-top">
        <span className="brand">
          <Logo />
          <span>Monitor Lab</span>
        </span>
        <button type="button" className="text-button" onClick={() => finish(onClose)}>Skip</button>
      </div>

      <div className="welcome-body">
        <div className="welcome-copy">
          <h1 id="welcome-title">See your next monitor before you buy it.</h1>
          <p className="welcome-lead">
            Compare a new monitor with the one on your desk: how much bigger it is, how much more fits on it, how sharp text looks and whether it fits your desk.
          </p>

          <div className="welcome-start">
            <ModelSearch
              label="What monitor do you have now?"
              catalogue={catalogue}
              loading={loading}
              selected={null}
              onSelect={(m) => finish(() => onPickCurrent(m))}
              onClear={() => undefined}
              placeholder={loading ? undefined : `Search ${catalogue.length} monitors, e.g. U2724D`}
            />
            <div className="welcome-alt">
              <button type="button" className="text-button" onClick={() => finish(onManual)}>I don't know the model</button>
              <button type="button" className="text-button muted-button" onClick={() => finish(onClose)}>Just look around</button>
            </div>
          </div>

          <ol className="welcome-steps">
            <li><strong>Your monitor</strong><span>Search for it, or just pick its size.</span></li>
            <li><strong>Your upgrade</strong><span>Choose one, or let us find a better fit.</span></li>
            <li><strong>Compare</strong><span>Side by side, then at real size on your screen.</span></li>
          </ol>
          <p className="welcome-note">Free, and no account needed.</p>
        </div>

        <SizeDemo />
      </div>
    </div>
  );
}

/** The hero: a bigger screen outlined around a typical one, at true relative scale, cycling through a few upgrades. */
function SizeDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 3800);
    return () => window.clearInterval(t);
  }, []);

  const ex = EXAMPLES[i];
  const a = dims(ex.from.size, ex.from.ratio);
  const b = dims(ex.to.size, ex.to.ratio);
  // One fixed scale for every example, so the sizes are honest relative to each other.
  const maxW = Math.max(...EXAMPLES.map((e) => dims(e.to.size, e.to.ratio).w));
  const maxH = Math.max(...EXAMPLES.map((e) => dims(e.to.size, e.to.ratio).h));
  const floorH = maxH * 1.32;
  const more = Math.round(((b.w * b.h) / (a.w * a.h) - 1) * 100);
  const box = (d: { w: number; h: number }) => ({ width: `${(d.w / maxW) * 100}%`, height: `${(d.h / floorH) * 100}%` });

  return (
    <figure className="size-demo" aria-label={`A ${ex.to.name} monitor drawn around a ${ex.from.name}, to scale`}>
      <div className="size-demo-frame">
        <div className="size-demo-floor" style={{ aspectRatio: `${maxW} / ${floorH}` }}>
          <div className="demo-screen is-next" style={box(b)}>
            <span>New</span>
          </div>
          <div className="demo-screen is-now" style={box(a)}>
            <span>Yours</span>
          </div>
          <div className="demo-stand" />
        </div>
      </div>
      <figcaption key={i}>
        <strong>{ex.from.name} to {ex.to.name}</strong>
        <span>{more}% more screen, drawn to scale</span>
      </figcaption>
    </figure>
  );
}
