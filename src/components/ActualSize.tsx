import { useEffect, useMemo, useRef, useState } from "react";
import type { Screen, Setup } from "../lib/types";
import { resolutionName, screenTitle } from "../lib/setup";
import { workPreviewMarkup } from "../lib/workPreview";
import { Icon } from "./Icon";

// A bank card is 85.60 mm wide (ISO/IEC 7810 ID-1), so matching one on screen gives pixels per millimetre.
const CARD_WIDTH_MM = 85.6;
const STORAGE_KEY = "monitorLabActualSizeCalibrationV1";

interface Calibration {
  pxPerMM: number;
  dpr: number;
}

let memoryCalibration: Calibration | null = null;

function readCalibration(): Calibration | null {
  let data: Calibration | null = memoryCalibration;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch {
    /* storage unavailable: fall back to this visit's value */
  }
  if (!data || !Number.isFinite(data.pxPerMM) || data.pxPerMM <= 0) return null;
  // A different zoom or display scale invalidates the measurement.
  if (Number.isFinite(data.dpr) && Math.abs(data.dpr - window.devicePixelRatio) > 0.02) return null;
  return data;
}

function saveCalibration(pxPerMM: number): Calibration {
  const calibration = { pxPerMM, dpr: window.devicePixelRatio };
  memoryCalibration = calibration;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...calibration, savedAt: Date.now() }));
  } catch {
    /* kept in memory for this visit */
  }
  return calibration;
}

export function isCalibrated(): boolean {
  return readCalibration() !== null;
}

interface Option {
  key: string;
  label: string;
  screen: Screen;
}

export function ActualSize({ current, next, onClose }: { current: Setup; next: Setup; onClose: () => void }) {
  const [calibration, setCalibration] = useState<Calibration | null>(() => readCalibration());
  const [calibrating, setCalibrating] = useState(() => readCalibration() === null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={calibrating ? "Calibrate your screen" : "Actual size view"}>
      {calibrating ? (
        <Calibrate
          initial={calibration ? calibration.pxPerMM * CARD_WIDTH_MM : 324}
          onCancel={calibration ? () => setCalibrating(false) : onClose}
          onSave={(px) => {
            setCalibration(saveCalibration(px / CARD_WIDTH_MM));
            setCalibrating(false);
          }}
        />
      ) : (
        calibration && <Viewer current={current} next={next} pxPerMM={calibration.pxPerMM} onRecalibrate={() => setCalibrating(true)} onClose={onClose} />
      )}
    </div>
  );
}

function Calibrate({ initial, onSave, onCancel }: { initial: number; onSave: (px: number) => void; onCancel: () => void }) {
  const [width, setWidth] = useState(Math.round(initial * 2) / 2);
  const clampWidth = (v: number) => Math.max(180, Math.min(600, v));
  return (
    <div className="calibrate">
      <button type="button" className="icon-button overlay-close" aria-label="Close" onClick={onCancel}>
        <Icon name="close" />
      </button>
      <span className="kicker">One-time setup</span>
      <h2>Hold a bank card against your screen</h2>
      <p>Drag the slider until the outline is exactly as wide as the card. Any standard bank, debit or loyalty card works.</p>
      <div className="card-stage">
        <div className="bank-card" style={{ width }} aria-hidden="true">
          <span className="chip-shape" />
        </div>
      </div>
      <div className="calibrate-controls">
        <button type="button" className="round-button light" aria-label="Make the outline smaller" onClick={() => setWidth((w) => clampWidth(w - 0.5))}>−</button>
        <input type="range" min={180} max={600} step={0.5} value={width} aria-label="Card outline width" onChange={(e) => setWidth(Number(e.target.value))} />
        <button type="button" className="round-button light" aria-label="Make the outline larger" onClick={() => setWidth((w) => clampWidth(w + 0.5))}>+</button>
      </div>
      <p className="mono hint">{width.toFixed(1)} px = 85.6 mm</p>
      <button type="button" className="primary-button" onClick={() => onSave(width)}>Save calibration</button>
      <p className="hint">Saved on this device until you change your zoom or display scaling.</p>
    </div>
  );
}

function Viewer({ current, next, pxPerMM, onRecalibrate, onClose }: { current: Setup; next: Setup; pxPerMM: number; onRecalibrate: () => void; onClose: () => void }) {
  const options = useMemo<Option[]>(() => {
    const list: Option[] = [];
    for (const [setup, group] of [[current, "Current"], [next, "New"]] as const) {
      for (const m of setup.monitors) {
        list.push({ key: `${group}-${m.slot}`, label: `${group} ${m.slot === "primary" ? "main" : "second"} · ${screenTitle(m, true)}${m.orientation === "portrait" ? " · portrait" : ""}`, screen: m });
      }
    }
    return list;
  }, [current, next]);
  const [key, setKey] = useState("New-primary");
  const option = options.find((o) => o.key === key) ?? options[0];
  const screen = option.screen;
  const width = screen.widthCM * 10 * pxPerMM;
  const height = screen.heightCM * 10 * pxPerMM;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
  }, [key, width, height]);

  return (
    <div className="viewer">
      <div className="viewer-bar">
        <div className="viewer-title">
          <strong>{screen.size}" · {resolutionName(screen)}{screen.orientation === "portrait" ? " · portrait" : ""}</strong>
          <span>{screen.widthCM.toFixed(1)} × {screen.heightCM.toFixed(1)} cm panel · {Math.round(screen.ppi)} PPI · drawn at real size</span>
        </div>
        <div className="viewer-picker" role="radiogroup" aria-label="Screen to show">
          {options.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={o.key === option.key} className="choice-chip" onClick={() => setKey(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
        <button type="button" className="text-button light" onClick={onRecalibrate}>Recalibrate</button>
        <button type="button" className="icon-button" aria-label="Exit actual size" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="viewer-scroll" ref={scrollRef}>
        <div className="viewer-canvas" style={{ width: Math.max(width + 160, 0), height: Math.max(height + 160, 0) }}>
          <div className="drawn-screen actual" style={{ width, height, padding: 0 }}>
            <div className="drawn-canvas" style={{ width, height }}>
              <div className="drawn-content" style={{ width: screen.effectiveX, height: screen.effectiveY, transform: `scale(${width / screen.effectiveX})` }} dangerouslySetInnerHTML={{ __html: workPreviewMarkup() }} />
            </div>
          </div>
        </div>
      </div>
      {width > window.innerWidth && <p className="viewer-hint">This screen is wider than yours. Scroll sideways to see all of it.</p>}
    </div>
  );
}
