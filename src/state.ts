import type { Desk, Mode, Orientation, Prefix, ScreenInput, SetupInput, Side, Slot } from "./lib/types";
import { defaultPreferences, type Preferences } from "./lib/finder";

export type StepId = "current" | "new" | "desk";
export type TabId = "workspace" | "desk" | "ports" | "insights";

export interface AppState {
  current: SetupInput;
  next: SetupInput;
  desk: Desk;
  /** Which step card is expanded on the left (null = all folded). */
  open: StepId | null;
  /** Steps the user has completed at least once, for the progress bar. */
  doneCurrent: boolean;
  doneNew: boolean;
  tab: TabId;
  finderOpen: boolean;
  prefs: Preferences;
  /** The "don't go smaller" rule is on by default for single setups and off for dual. */
  notSmallerDual: boolean;
  /** For a dual upgrade found by the finder: keep a screen you own, or configure another. */
  finderSecondary: { plan: "keep" | "configure"; source: Slot };
  /** Dual upgrade uses the same model twice (the second screen mirrors the main one). */
  pairNew: boolean;
  /** The finder results the comparison is stepping through, by model id. */
  shortlist: string[];
  shortlistIndex: number;
}

const screen = (size: number, resolution: string, scaling: number, orientation: Orientation = "landscape"): ScreenInput => ({
  size,
  resolution,
  scaling,
  orientation,
  modelId: null,
});

// Same starting values as the original page.
export const initialState: AppState = {
  current: { mode: "single", primary: screen(27, "1920x1080", 100), secondary: screen(27, "1920x1080", 100), position: "right" },
  next: { mode: "single", primary: screen(32, "3840x2160", 125), secondary: screen(27, "1920x1080", 100), position: "left" },
  desk: { width: 140, depth: 70, shelf: null },
  open: "current",
  doneCurrent: false,
  doneNew: false,
  tab: "workspace",
  finderOpen: false,
  prefs: defaultPreferences,
  notSmallerDual: false,
  finderSecondary: { plan: "keep", source: "primary" },
  pairNew: false,
  shortlist: [],
  shortlistIndex: -1,
};

export type Action =
  | { type: "screen"; prefix: Prefix; slot: Slot; patch: Partial<ScreenInput> }
  | { type: "mode"; prefix: Prefix; mode: Mode }
  | { type: "position"; prefix: Prefix; position: Side }
  | { type: "desk"; patch: Partial<Desk> }
  | { type: "open"; step: StepId | null }
  | { type: "complete"; step: "current" | "new" }
  | { type: "tab"; tab: TabId }
  | { type: "finder"; open: boolean }
  | { type: "prefs"; patch: Partial<Preferences> }
  | { type: "notSmallerDual"; value: boolean }
  | { type: "finderSecondary"; patch: Partial<AppState["finderSecondary"]> }
  | { type: "replace"; state: Partial<AppState> }
  | { type: "pairNew"; value: boolean }
  | { type: "chooseRecommendation"; ids: string[]; index: number; primary: ScreenInput; secondary?: ScreenInput };

const key = (prefix: Prefix) => (prefix === "current" ? "current" : "next");

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "screen": {
      const k = key(action.prefix);
      const setup = state[k];
      const leavesShortlist = action.prefix === "new" && action.slot === "primary" && "modelId" in action.patch;
      return {
        ...state,
        [k]: { ...setup, [action.slot]: { ...setup[action.slot], ...action.patch } },
        ...(leavesShortlist ? { shortlist: [], shortlistIndex: -1 } : {}),
      };
    }
    case "mode": {
      const k = key(action.prefix);
      return { ...state, [k]: { ...state[k], mode: action.mode } };
    }
    case "position": {
      const k = key(action.prefix);
      return { ...state, [k]: { ...state[k], position: action.position } };
    }
    case "desk":
      return { ...state, desk: { ...state.desk, ...action.patch } };
    case "open":
      return { ...state, open: action.step };
    case "complete":
      return action.step === "current"
        ? { ...state, doneCurrent: true, open: state.doneNew ? null : "new" }
        : { ...state, doneNew: true, doneCurrent: true, open: null };
    case "tab":
      return { ...state, tab: action.tab };
    case "finder":
      return { ...state, finderOpen: action.open, open: action.open ? null : state.open };
    case "prefs":
      return { ...state, prefs: { ...state.prefs, ...action.patch } };
    case "notSmallerDual":
      return { ...state, notSmallerDual: action.value };
    case "finderSecondary":
      return { ...state, finderSecondary: { ...state.finderSecondary, ...action.patch } };
    case "pairNew":
      return { ...state, pairNew: action.value };
    case "replace":
      return { ...state, ...action.state };
    case "chooseRecommendation":
      return {
        ...state,
        next: { ...state.next, primary: action.primary, secondary: action.secondary ?? state.next.secondary },
        shortlist: action.ids,
        shortlistIndex: action.index,
        doneCurrent: true,
        doneNew: true,
        open: null,
        tab: state.tab,
      };
  }
}
