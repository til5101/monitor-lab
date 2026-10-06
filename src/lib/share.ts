// Share links. Uses the same ml_* parameters as the original page, so links made on the old site still open.
import type { AppState } from "../state";
import type { Mode, Orientation, ScreenInput, Side, SetupInput } from "./types";

const NUMBER = /^\d+(\.\d+)?$/;
const RESOLUTION = /^\d{3,5}x\d{3,5}$/;

type Params = URLSearchParams;

function screenFrom(params: Params, p: string, base: ScreenInput): ScreenInput {
  const size = params.get(`ml_${p}s`);
  const resolution = params.get(`ml_${p}r`);
  const scaling = params.get(`ml_${p}c`);
  const orientation = params.get(`ml_${p}o`);
  const model = params.get(`ml_${p}m`);
  return {
    size: size && NUMBER.test(size) ? Number(size) : base.size,
    resolution: resolution && RESOLUTION.test(resolution) ? resolution : base.resolution,
    scaling: scaling && [100, 125, 150, 175, 200].includes(Number(scaling)) ? Number(scaling) : base.scaling,
    orientation: orientation === "portrait" || orientation === "landscape" ? (orientation as Orientation) : base.orientation,
    modelId: model && /^[\w-]{1,64}$/.test(model) ? model : null,
  };
}

function setupFrom(params: Params, prefix: "c" | "n", base: SetupInput): SetupInput {
  const mode = params.get(`ml_${prefix}m`);
  const side = params.get(`ml_${prefix}sp`);
  return {
    mode: mode === "dual" || mode === "single" ? (mode as Mode) : base.mode,
    primary: screenFrom(params, `${prefix}p`, base.primary),
    secondary: screenFrom(params, `${prefix}s`, base.secondary),
    position: side === "left" || side === "right" ? (side as Side) : base.position,
  };
}

/** Reads a comparison from a URL's query string. Returns null if the link isn't a comparison. */
export function readShareParams(search: string, base: AppState): Partial<AppState> | null {
  const params = new URLSearchParams(search);
  if (params.get("ml_v") !== "1") return null;
  const current = setupFrom(params, "c", base.current);
  if (params.get("ml_csame") === "1") current.secondary = { ...current.primary, orientation: current.secondary.orientation };
  const next = setupFrom(params, "n", base.next);
  const num = (key: string, min: number, max: number) => {
    const v = Number.parseFloat(params.get(key) ?? "");
    return Number.isFinite(v) && v >= min && v <= max ? v : null;
  };
  const plan = params.get("ml_nspn");
  const source = params.get("ml_nsrc");
  return {
    current,
    next,
    desk: {
      width: num("ml_desk", 60, 300) ?? base.desk.width,
      depth: num("ml_desk_d", 30, 150) ?? base.desk.depth,
      shelf: num("ml_desk_h", 20, 200),
    },
    pairNew: next.mode === "dual" && (params.get("ml_mpair") === "1" || (plan === "configure" && params.get("ml_pair") === "1")),
    finderSecondary: {
      plan: plan === "configure" ? "configure" : "keep",
      source: source === "secondary" ? "secondary" : "primary",
    },
    prefs: { ...base.prefs, fitDesk: params.get("ml_desk_filter") === "1" },
    doneCurrent: true,
    doneNew: true,
    open: null,
  };
}

export function buildShareUrl(state: AppState, origin: string): string {
  const url = new URL("/", origin);
  const p = url.searchParams;
  const put = (key: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") p.set(key, String(value));
  };
  put("ml_v", 1);
  put("ml_cm", state.current.mode);
  put("ml_nm", state.next.mode);
  const screen = (prefix: string, s: ScreenInput, secondary: boolean) => {
    put(`ml_${prefix}s`, s.size);
    put(`ml_${prefix}r`, s.resolution);
    put(`ml_${prefix}c`, s.scaling);
    if (secondary) put(`ml_${prefix}o`, s.orientation);
    put(`ml_${prefix}m`, s.modelId);
  };
  screen("cp", state.current.primary, false);
  screen("cs", state.current.secondary, true);
  put("ml_csp", state.current.position);
  screen("np", state.next.primary, false);
  screen("ns", state.next.secondary, true);
  put("ml_nsp", state.next.position);
  put("ml_nspn", state.finderSecondary.plan);
  put("ml_nsrc", state.finderSecondary.source);
  put("ml_mpair", state.pairNew ? 1 : 0);
  put("ml_desk", state.desk.width);
  put("ml_desk_d", state.desk.depth);
  put("ml_desk_h", state.desk.shelf);
  put("ml_desk_filter", state.prefs.fitDesk ? 1 : 0);
  return url.toString();
}
