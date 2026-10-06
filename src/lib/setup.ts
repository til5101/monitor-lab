// Screen and setup maths. Ported from the original Monitor Lab page (v11) without changing results.
import type { Desk, MonitorModel, Orientation, Prefix, Screen, ScreenInput, Setup, SetupInput, Slot } from "./types";

export const SIZE_OPTIONS = [21.5, 24, 25, 27, 28, 32, 34, 38, 40, 42, 49];
export const RESOLUTION_OPTIONS = ["1920x1080", "2560x1440", "3440x1440", "3840x1600", "3840x2160", "5120x1440"];
export const SCALING_OPTIONS = [100, 125, 150, 175, 200];

const RESOLUTION_NAMES: Record<string, string> = {
  "1920x1080": "Full HD",
  "2560x1440": "QHD",
  "3440x1440": "Ultrawide",
  "3840x1600": "Ultrawide",
  "3840x2160": "4K",
  "5120x1440": "Super Ultrawide",
  "5120x2160": "5K2K Ultrawide",
};

export const prettyResolution = (resolution: string) => resolution.replace("x", " × ");

export function resolutionOptionLabel(resolution: string): string {
  const name = RESOLUTION_NAMES[resolution];
  return prettyResolution(resolution) + (name ? ` · ${name}` : "");
}

export function modelMetaText(m: MonitorModel): string {
  return `${m.size}" · ${prettyResolution(m.resolution)} · ${m.refresh ? `${m.refresh}Hz · ` : ""}${m.panel}${m.shape === "Curved" ? " · curved" : ""}`;
}

export interface PhysicalDimensions {
  widthCM: number;
  bodyHeightCM: number;
  /** Height needed above the desktop: the stand at its lowest, or a raised pop-up webcam. */
  requiredHeightCM: number;
  verified: boolean;
  webcamClearanceUnknown: boolean;
}

export function modelDeskDimensions(
  model: MonitorModel | null,
  orientation: Orientation,
  fallbackWidthCM: number,
  fallbackHeightCM: number,
): PhysicalDimensions {
  let bodyWidthCM = fallbackWidthCM;
  let bodyHeightCM = fallbackHeightCM;
  const verified = Boolean(model?.physicalDimensionsVerified);
  if (model && verified) {
    const w = Number.isFinite(model.widthMm) ? (model.widthMm as number) / 10 : fallbackWidthCM;
    const h = Number.isFinite(model.panelHeightMm) ? (model.panelHeightMm as number) / 10 : fallbackHeightCM;
    [bodyWidthCM, bodyHeightCM] = orientation === "portrait" ? [h, w] : [w, h];
  }
  let requiredHeightCM = bodyHeightCM;
  if (model && verified) {
    const installed = Number.isFinite(model.heightWithStandMinMm)
      ? model.heightWithStandMinMm
      : Number.isFinite(model.heightWithStandMaxMm)
        ? model.heightWithStandMaxMm
        : null;
    if (installed !== null) requiredHeightCM = Math.max(requiredHeightCM, installed / 10);
    if (model.webcamPopUp && Number.isFinite(model.webcamExtendedHeightMm)) {
      requiredHeightCM = Math.max(requiredHeightCM, (model.webcamExtendedHeightMm as number) / 10);
    }
  }
  return {
    widthCM: bodyWidthCM,
    bodyHeightCM,
    requiredHeightCM,
    verified,
    webcamClearanceUnknown: Boolean(model?.webcamPopUp && !Number.isFinite(model.webcamExtendedHeightMm)),
  };
}

export function computeScreen(slot: Slot, input: ScreenInput, model: MonitorModel | null): Screen {
  const size = model ? model.size : input.size;
  const resolution = model ? model.resolution : input.resolution;
  const orientation: Orientation = slot === "secondary" ? input.orientation : "landscape";
  const [nativeX, nativeY] = resolution.split("x").map(Number);
  const diagonalPixels = Math.hypot(nativeX, nativeY);
  let widthIn = (size * nativeX) / diagonalPixels;
  let heightIn = (size * nativeY) / diagonalPixels;
  let pixelsX = nativeX;
  let pixelsY = nativeY;
  if (orientation === "portrait") {
    [pixelsX, pixelsY] = [pixelsY, pixelsX];
    [widthIn, heightIn] = [heightIn, widthIn];
  }
  const scale = input.scaling / 100;
  const physical = modelDeskDimensions(model, orientation, widthIn * 2.54, heightIn * 2.54);
  return {
    slot,
    size,
    orientation,
    pixelsX,
    pixelsY,
    nativePixelsX: nativeX,
    nativePixelsY: nativeY,
    scaling: input.scaling,
    effectiveX: Math.round(pixelsX / scale),
    effectiveY: Math.round(pixelsY / scale),
    widthCM: widthIn * 2.54,
    heightCM: heightIn * 2.54,
    deskWidthCM: physical.widthCM,
    deskHeightCM: physical.requiredHeightCM,
    bodyHeightCM: physical.bodyHeightCM,
    physicalDimensionsVerified: physical.verified,
    webcamClearanceUnknown: physical.webcamClearanceUnknown,
    ppi: diagonalPixels / size,
    model,
  };
}

export function computeSetup(prefix: Prefix, input: SetupInput, findModel: (id: string | null) => MonitorModel | null): Setup {
  const primary = computeScreen("primary", input.primary, findModel(input.primary.modelId));
  const monitors = [primary];
  if (input.mode === "dual") {
    const secondary = computeScreen("secondary", input.secondary, findModel(input.secondary.modelId));
    if (input.position === "left") monitors.unshift(secondary);
    else monitors.push(secondary);
  }
  return { prefix, mode: input.mode, primary, monitors, secondaryPosition: input.position };
}

const GAP_CM = 2;

/** Panel width from the diagonal, used to draw screens to scale. */
export function setupWidthCM(setup: Setup): number {
  return setup.monitors.reduce((t, m) => t + m.widthCM, 0) + (setup.monitors.length > 1 ? GAP_CM : 0);
}

export function setupHeightCM(setup: Setup): number {
  return Math.max(...setup.monitors.map((m) => m.heightCM));
}

/** Physical width on the desk, from verified dimensions where available. */
export function setupDeskWidthCM(setup: Setup): number {
  return setup.monitors.reduce((t, m) => t + (Number.isFinite(m.deskWidthCM) ? m.deskWidthCM : m.widthCM), 0) + (setup.monitors.length > 1 ? GAP_CM : 0);
}

export function setupDeskHeightCM(setup: Setup): number {
  return Math.max(...setup.monitors.map((m) => (Number.isFinite(m.deskHeightCM) ? m.deskHeightCM : m.heightCM)));
}

export const setupHasUnknownWebcamClearance = (setup: Setup) => setup.monitors.some((m) => m.webcamClearanceUnknown);
export const setupPhysicalArea = (setup: Setup) => setup.monitors.reduce((t, m) => t + m.widthCM * m.heightCM, 0);
export const setupWorkspaceArea = (setup: Setup) => setup.monitors.reduce((t, m) => t + m.effectiveX * m.effectiveY, 0);

export function resolutionName(screen: Screen): string {
  const key = `${screen.nativePixelsX}x${screen.nativePixelsY}`;
  const names: Record<string, string> = {
    "1920x1080": "1080p",
    "2560x1440": "1440p",
    "3840x2160": "4K",
    "3440x1440": "3440×1440",
    "5120x1440": "5120×1440",
  };
  return names[key] ?? `${screen.nativePixelsX}×${screen.nativePixelsY}`;
}

export function screenTitle(screen: Screen, compact = false): string {
  if (screen.model) return compact ? screen.model.model : `${screen.model.brand} ${screen.model.model}`;
  return `${screen.size}" ${resolutionName(screen)}`;
}

export function setupTitle(setup: Setup): string {
  if (setup.monitors.length === 1) return screenTitle(setup.primary);
  const secondary = setup.monitors.find((m) => m.slot === "secondary") as Screen;
  return `${screenTitle(setup.primary, true)} + ${screenTitle(secondary, true)}${secondary.orientation === "portrait" ? " · portrait" : ""}`;
}

export function workspaceLabel(setup: Setup): string {
  if (setup.monitors.length === 1) return `${setup.primary.effectiveX} × ${setup.primary.effectiveY}`;
  return `${(setupWorkspaceArea(setup) / 1e6).toFixed(1)}M effective pixels`;
}

/** Rough count of side-by-side work windows, as on the original page. */
export function contentDescription(setup: Setup): string {
  const capacity = setup.monitors.reduce((t, m) => t + Math.max(1, Math.min(3, Math.floor(m.effectiveX / 900))), 0);
  if (setup.monitors.length === 1) return `Room for about ${capacity} work window${capacity === 1 ? "" : "s"}`;
  return `Room for about ${capacity} work windows across the setup`;
}

/* ---------- Desk ---------- */

export const clampDeskWidth = (v: number) => (!v || v < 60 ? 60 : v > 300 ? 300 : v);
export const clampDeskDepth = (v: number) => (Number.isFinite(v) && v > 0 ? Math.max(30, Math.min(150, v)) : 70);
export function clampDeskHeight(v: number | null): number | null {
  if (v === null || !Number.isFinite(v) || v <= 0) return null;
  return Math.max(20, Math.min(200, v));
}

export function monitorStandDepth(model: MonitorModel | null): number | null {
  return model && model.physicalDimensionsVerified && Number.isFinite(model.depthWithStandMm) && (model.depthWithStandMm as number) > 0
    ? (model.depthWithStandMm as number) / 10
    : null;
}

export function depthInfoForModels(models: (MonitorModel | null)[]) {
  const depths = models.map(monitorStandDepth);
  const known = depths.filter((d): d is number => d !== null);
  return { knownDepth: Math.max(0, ...known), verified: depths.every((d) => d !== null) };
}

export const setupDepthInfo = (setup: Setup) => depthInfoForModels(setup.monitors.map((m) => m.model));

export interface DeskFit {
  width: number;
  height: number;
  widthSpare: number;
  depthSpare: number;
  heightSpare: number | null;
  depthVerified: boolean;
  knownDepth: number;
  over: boolean;
  tight: boolean;
  overWidth: boolean;
  overDepth: boolean;
  overHeight: boolean;
  parts: string[];
}

export function deskFit(setup: Setup, desk: Desk): DeskFit {
  const width = setupDeskWidthCM(setup);
  const height = setupDeskHeightCM(setup);
  const info = setupDepthInfo(setup);
  const widthSpare = desk.width - width;
  const depthSpare = desk.depth - info.knownDepth;
  const heightSpare = desk.shelf !== null ? desk.shelf - height : null;
  const overWidth = widthSpare < 0;
  const overDepth = depthSpare < 0;
  const overHeight = heightSpare !== null && heightSpare < 0;
  const over = overWidth || overDepth || overHeight;
  const tight = !over && (widthSpare < desk.width * 0.1 || (info.verified && depthSpare < 10) || (heightSpare !== null && heightSpare < 3));
  const parts = [overWidth ? `${(-widthSpare).toFixed(1)} cm too wide` : `${widthSpare.toFixed(1)} cm width spare`];
  if (overDepth) parts.push(`${(-depthSpare).toFixed(1)} cm too deep`);
  else if (info.verified) parts.push(`${depthSpare.toFixed(1)} cm depth spare`);
  if (!info.verified) parts.push("Stand depth unverified");
  if (heightSpare !== null) parts.push(`${Math.abs(heightSpare).toFixed(1)}${heightSpare < 0 ? " cm too tall" : " cm below shelf"}`);
  if (tight) parts.push("Tight fit");
  if (desk.shelf !== null && setupHasUnknownWebcamClearance(setup)) parts.push("Pop-up webcam needs unverified extra clearance");
  return { width, height, widthSpare, depthSpare, heightSpare, depthVerified: info.verified, knownDepth: info.knownDepth, over, tight, overWidth, overDepth, overHeight, parts };
}

/* ---------- Comparison figures ---------- */

export interface Stat {
  key: string;
  label: string;
  current: string;
  next: string;
  change: string;
  /** Whether the change is good, bad or neither for the user. */
  tone: "up" | "down" | "neutral";
  note: string;
}

const signedPercent = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v)}%`;

export function compareStats(current: Setup, next: Setup): Stat[] {
  const areaC = setupPhysicalArea(current);
  const areaN = setupPhysicalArea(next);
  const areaChange = (areaN / areaC - 1) * 100;
  const ppiC = Math.round(current.primary.ppi);
  const ppiN = Math.round(next.primary.ppi);
  const widthC = setupDeskWidthCM(current);
  const widthN = setupDeskWidthCM(next);
  const wsC = setupWorkspaceArea(current);
  const wsN = setupWorkspaceArea(next);
  const wsChange = (wsN / wsC - 1) * 100;
  const tone = (v: number, threshold: number) => (v > threshold ? "up" : v < -threshold ? "down" : "neutral");
  return [
    { key: "area", label: "Screen area", current: `${Math.round(areaC).toLocaleString("en-GB")} cm²`, next: `${Math.round(areaN).toLocaleString("en-GB")} cm²`, change: signedPercent(areaChange), tone: tone(areaChange, 5), note: "physical panel area" },
    { key: "ppi", label: "Sharpness", current: `${ppiC} PPI`, next: `${ppiN} PPI`, change: `${ppiN - ppiC >= 0 ? "+" : ""}${ppiN - ppiC}`, tone: tone(((ppiN / ppiC) - 1) * 100, 5), note: "main-screen pixel density" },
    { key: "width", label: "Setup width", current: `${widthC.toFixed(1)} cm`, next: `${widthN.toFixed(1)} cm`, change: `${widthN - widthC >= 0 ? "+" : ""}${(widthN - widthC).toFixed(1)} cm`, tone: "neutral", note: "verified dimensions where available" },
    { key: "workspace", label: "Usable workspace", current: `${(wsC / 1e6).toFixed(1)}M px`, next: `${(wsN / 1e6).toFixed(1)}M px`, change: signedPercent(wsChange), tone: tone(wsChange, 5), note: "effective pixels after scaling" },
  ];
}
