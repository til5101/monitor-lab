import type { Desk, Mode, Orientation, Prefix, ScreenInput, SetupInput, Side, Slot } from "./lib/types";

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
};

export type Action =
  | { type: "screen"; prefix: Prefix; slot: Slot; patch: Partial<ScreenInput> }
  | { type: "mode"; prefix: Prefix; mode: Mode }
  | { type: "position"; prefix: Prefix; position: Side }
  | { type: "desk"; patch: Partial<Desk> }
  | { type: "open"; step: StepId | null }
  | { type: "complete"; step: "current" | "new" }
  | { type: "tab"; tab: TabId };

const key = (prefix: Prefix) => (prefix === "current" ? "current" : "next");

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "screen": {
      const k = key(action.prefix);
      const setup = state[k];
      return { ...state, [k]: { ...setup, [action.slot]: { ...setup[action.slot], ...action.patch } } };
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
  }
}
