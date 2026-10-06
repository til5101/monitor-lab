// Upgrade finder: filters and scores the catalogue against the user's current main screen.
// Weights, caps and penalties are ported unchanged from the original page (v11).
import type { Desk, MonitorModel, Orientation, Screen } from "./types";
import { depthInfoForModels, modelDeskDimensions } from "./setup";

export type UseCase = "mixed" | "productivity" | "gaming" | "creative";
export type Priority = "balanced" | "workspace" | "sharpness" | "refresh" | "size";
export type SizePreference = "any" | "similar" | "27" | "32" | "ultrawide" | "large";

export interface Preferences {
  useCase: UseCase;
  priority: Priority;
  size: SizePreference;
  panel: "any" | "ips" | "oled" | "va";
  shape: "any" | "flat" | "curved";
  minimumRefresh: number;
  notSmaller: boolean;
  fitDesk: boolean;
  minimumHdmi: number;
  minimumDisplayport: number;
  usbCVideo: boolean;
  minimumUsbCPower: number;
  displayportOut: boolean;
  thunderbolt: boolean;
  usbHub: boolean;
  ethernet: boolean;
  kvm: boolean;
  speakers: boolean;
  webcam: boolean;
  microphone: boolean;
  audioOut: boolean;
}

export const defaultPreferences: Preferences = {
  useCase: "mixed",
  priority: "balanced",
  size: "any",
  panel: "any",
  shape: "any",
  minimumRefresh: 0,
  notSmaller: true,
  fitDesk: false,
  minimumHdmi: 0,
  minimumDisplayport: 0,
  usbCVideo: false,
  minimumUsbCPower: 0,
  displayportOut: false,
  thunderbolt: false,
  usbHub: false,
  ethernet: false,
  kvm: false,
  speakers: false,
  webcam: false,
  microphone: false,
  audioOut: false,
};

/** What sits beside the recommended screen when the new setup is dual. */
export type SecondaryContext =
  | { kind: "none" }
  | { kind: "screen"; screen: Screen }
  | { kind: "pair"; orientation: Orientation };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const resolutionParts = (m: MonitorModel) => m.resolution.split("x").map(Number) as [number, number];
const aspectRatio = (m: MonitorModel) => {
  const [x, y] = resolutionParts(m);
  return x / y;
};

export function recommendedScaling(model: MonitorModel): number {
  const [x, y] = resolutionParts(model);
  const ppi = Math.hypot(x, y) / model.size;
  if (ppi <= 115) return 100;
  if (ppi <= 145) return 125;
  if (ppi <= 175) return 150;
  if (ppi <= 210) return 175;
  return 200;
}

export interface Metrics {
  model: MonitorModel;
  nativeX: number;
  nativeY: number;
  nativeArea: number;
  ppi: number;
  widthCM: number;
  heightCM: number;
  deskWidthCM: number;
  deskHeightCM: number;
  scaling: number;
  effectiveX: number;
  effectiveY: number;
}

export function metricsForModel(model: MonitorModel): Metrics {
  const [x, y] = resolutionParts(model);
  const diagonal = Math.hypot(x, y);
  const widthCM = ((model.size * x) / diagonal) * 2.54;
  const heightCM = ((model.size * y) / diagonal) * 2.54;
  const scaling = recommendedScaling(model);
  const physical = modelDeskDimensions(model, "landscape", widthCM, heightCM);
  return {
    model,
    nativeX: x,
    nativeY: y,
    nativeArea: x * y,
    ppi: diagonal / model.size,
    widthCM,
    heightCM,
    deskWidthCM: physical.widthCM,
    deskHeightCM: physical.requiredHeightCM,
    scaling,
    effectiveX: Math.round(x / (scaling / 100)),
    effectiveY: Math.round(y / (scaling / 100)),
  };
}

export function panelFamily(panel: string): "oled" | "ips" | "va" | "other" {
  const clean = panel.toLowerCase();
  if (clean.includes("oled")) return "oled";
  if (clean.includes("ips")) return "ips";
  if (clean.includes("va")) return "va";
  return "other";
}

function matchesSize(model: MonitorModel, preference: SizePreference, current: Screen): boolean {
  switch (preference) {
    case "similar": return Math.abs(model.size - current.size) <= 2.25;
    case "27": return model.size >= 25.5 && model.size <= 28.5;
    case "32": return model.size >= 30.5 && model.size <= 33.5;
    case "ultrawide": return model.size >= 33 && aspectRatio(model) >= 2.15;
    case "large": return model.size >= 39;
    default: return true;
  }
}

function pairDimensions(metrics: Metrics, orientation: Orientation) {
  const portrait = orientation === "portrait";
  return modelDeskDimensions(metrics.model, orientation, portrait ? metrics.heightCM : metrics.widthCM, portrait ? metrics.widthCM : metrics.heightCM);
}

export function projectedDeskWidth(metrics: Metrics, secondary: SecondaryContext): number {
  let width = Number.isFinite(metrics.deskWidthCM) ? metrics.deskWidthCM : metrics.widthCM;
  if (secondary.kind === "pair") width += pairDimensions(metrics, secondary.orientation).widthCM + 2;
  else if (secondary.kind === "screen") width += (Number.isFinite(secondary.screen.deskWidthCM) ? secondary.screen.deskWidthCM : secondary.screen.widthCM) + 2;
  return width;
}

export function projectedDeskHeight(metrics: Metrics, secondary: SecondaryContext): number {
  let height = Number.isFinite(metrics.deskHeightCM) ? metrics.deskHeightCM : metrics.heightCM;
  if (secondary.kind === "pair") height = Math.max(height, pairDimensions(metrics, secondary.orientation).requiredHeightCM);
  else if (secondary.kind === "screen") height = Math.max(height, Number.isFinite(secondary.screen.deskHeightCM) ? secondary.screen.deskHeightCM : secondary.screen.heightCM);
  return height;
}

export function candidateDepthInfo(model: MonitorModel, secondary: SecondaryContext) {
  const models: (MonitorModel | null)[] = [model];
  if (secondary.kind === "pair") models.push(model);
  else if (secondary.kind === "screen") models.push(secondary.screen.model);
  return depthInfoForModels(models);
}

function panelBonus(model: MonitorModel, useCase: UseCase): number {
  const family = panelFamily(model.panel);
  const table: Record<UseCase, Partial<Record<string, number>>> = {
    gaming: { oled: 0.3, ips: 0.12 },
    productivity: { ips: 0.18 },
    creative: { oled: 0.28, ips: 0.25 },
    mixed: { oled: 0.2, ips: 0.13 },
  };
  return table[useCase][family] ?? 0;
}

export function featureRequirementsActive(p: Preferences): boolean {
  return p.minimumHdmi > 0 || p.minimumDisplayport > 0 || p.usbCVideo || p.minimumUsbCPower > 0 || p.displayportOut || p.thunderbolt || p.usbHub || p.ethernet || p.kvm || p.speakers || p.webcam || p.microphone || p.audioOut;
}

function passesFeatures(m: MonitorModel, p: Preferences): boolean {
  if (!featureRequirementsActive(p)) return true;
  if (!m.featuresVerified) return false;
  const has = (v: number | null, min = 1) => v !== null && Number.isFinite(v) && v >= min;
  if (p.minimumHdmi > 0 && !has(m.hdmiPorts, p.minimumHdmi)) return false;
  if (p.minimumDisplayport > 0 && !has(m.displayportPorts, p.minimumDisplayport)) return false;
  if (p.usbCVideo && !(m.usbCVideo || has(m.thunderboltPorts))) return false;
  if (p.minimumUsbCPower > 0 && !has(m.usbCPowerDeliveryW, p.minimumUsbCPower)) return false;
  if (p.displayportOut && !has(m.displayportOutPorts)) return false;
  if (p.thunderbolt && !has(m.thunderboltPorts)) return false;
  if (p.usbHub && !(has(m.usbAPorts) || has(m.usbBUpstreamPorts))) return false;
  if (p.ethernet && !m.ethernet) return false;
  if (p.kvm && !m.kvm) return false;
  if (p.speakers && !m.speakers) return false;
  if (p.webcam && !m.webcam) return false;
  if (p.microphone && !m.microphone) return false;
  if (p.audioOut && !m.audioOut) return false;
  return true;
}

export function passesFilters(model: MonitorModel, current: Screen, p: Preferences, desk: Desk, secondary: SecondaryContext): boolean {
  if (current.model && current.model.id === model.id) return false;
  if (p.notSmaller && model.size < current.size - 0.25) return false;
  if (!matchesSize(model, p.size, current)) return false;
  if (p.panel !== "any" && panelFamily(model.panel) !== p.panel) return false;
  if (p.shape !== "any" && model.shape.toLowerCase() !== p.shape) return false;
  if (p.minimumRefresh > 0 && (!model.refresh || model.refresh < p.minimumRefresh)) return false;
  if (!passesFeatures(model, p)) return false;
  if (p.fitDesk) {
    if (candidateDepthInfo(model, secondary).knownDepth > desk.depth) return false;
    const metrics = metricsForModel(model);
    if (projectedDeskWidth(metrics, secondary) > desk.width) return false;
    if (desk.shelf !== null && projectedDeskHeight(metrics, secondary) > desk.shelf) return false;
  }
  return true;
}

export interface Recommendation {
  model: MonitorModel;
  metrics: Metrics;
  score: number;
  workspaceGain: number;
  ppiGain: number;
  sizeGain: number;
  refreshGain: number;
  projectedDeskWidth: number;
  projectedDeskHeight: number;
}

export function scoreModel(model: MonitorModel, current: Screen, p: Preferences, secondary: SecondaryContext): Recommendation {
  const metrics = metricsForModel(model);
  const workspaceGain = (metrics.effectiveX * metrics.effectiveY) / (current.effectiveX * current.effectiveY) - 1;
  const ppiGain = metrics.ppi / current.ppi - 1;
  const sizeGain = model.size / current.size - 1;
  const currentRefresh = current.model?.refresh ? current.model.refresh : 60;
  const refreshGain = model.refresh ? model.refresh / currentRefresh - 1 : 0;
  const refreshAbsolute = model.refresh ? model.refresh / 240 : 0;
  const nativePixelsGain = metrics.nativeArea / (current.nativePixelsX * current.nativePixelsY) - 1;
  const sharpnessCap = p.useCase === "creative" || p.priority === "sharpness" ? 2 : 1.25;
  const resolutionCap = p.useCase === "creative" || p.priority === "resolution" as Priority ? 5 : 2.5;
  const factors = {
    workspace: clamp(workspaceGain, -1, 3),
    sharpness: clamp(ppiGain, -0.75, sharpnessCap),
    size: clamp(sizeGain, -0.5, 1.5),
    refresh: clamp(refreshGain, -0.75, 4) * 0.55 + clamp(refreshAbsolute, 0, 1.5) * 0.45,
    resolution: clamp(nativePixelsGain, -0.75, resolutionCap),
  };
  const weightsByUse: Record<UseCase, Record<keyof typeof factors, number>> = {
    productivity: { workspace: 0.43, sharpness: 0.3, size: 0.13, refresh: 0.05, resolution: 0.09 },
    gaming: { workspace: 0.08, sharpness: 0.15, size: 0.1, refresh: 0.47, resolution: 0.2 },
    creative: { workspace: 0.22, sharpness: 0.35, size: 0.12, refresh: 0.06, resolution: 0.25 },
    mixed: { workspace: 0.25, sharpness: 0.22, size: 0.11, refresh: 0.24, resolution: 0.18 },
  };
  const weights = { ...weightsByUse[p.useCase] };
  if (p.priority !== "balanced" && p.priority in weights) weights[p.priority as keyof typeof weights] += 0.35;

  let score = (Object.keys(factors) as (keyof typeof factors)[]).reduce((t, k) => t + factors[k] * weights[k], 0);
  score += panelBonus(model, p.useCase);

  const usbCLaptop = (model.usbCVideo || (model.thunderboltPorts ?? 0) > 0) && (model.usbCPowerDeliveryW ?? 0) >= 65;
  if (p.useCase === "productivity") {
    if (usbCLaptop) score += 0.1;
    if (model.ethernet) score += 0.08;
    if (model.kvm) score += 0.06;
  } else if (p.useCase === "mixed") {
    if (usbCLaptop) score += 0.04;
    if (model.ethernet) score += 0.03;
    if (model.kvm) score += 0.02;
  }
  if (model.shape === "Curved" && aspectRatio(model) >= 2.15) score += 0.05;
  if (workspaceGain < -0.1 && p.priority !== "refresh") score -= 0.45;
  if (ppiGain < -0.08 && p.priority === "sharpness") score -= 0.75;
  // Soft guards so raw resolution maths can't override the user's intent.
  if (p.useCase === "gaming" && refreshGain < -0.05 && !["sharpness", "resolution", "workspace"].includes(p.priority)) score -= 0.65;
  if (p.priority === "refresh" && refreshGain < 0) score -= 1;
  if (p.priority === "balanced" && p.size === "any") {
    if (sizeGain > 0.35) score -= 0.35;
    if (sizeGain > 0.55) score -= 0.35;
    if (sizeGain > 0.8) score -= 0.25;
  }
  if (p.priority === "balanced" && p.useCase !== "creative") {
    if (nativePixelsGain > 3) score -= 0.2;
    if (nativePixelsGain > 5) score -= 0.15;
  }
  return {
    model,
    metrics,
    score,
    workspaceGain,
    ppiGain,
    sizeGain,
    refreshGain,
    projectedDeskWidth: projectedDeskWidth(metrics, secondary),
    projectedDeskHeight: projectedDeskHeight(metrics, secondary),
  };
}

/** The first four results show at most two per brand; nothing is dropped. */
export function diversify(scored: Recommendation[]): Recommendation[] {
  const top: Recommendation[] = [];
  const brandCounts: Record<string, number> = {};
  for (const item of scored) {
    if (top.length >= 4) break;
    const count = brandCounts[item.model.brand] ?? 0;
    if (count >= 2) continue;
    top.push(item);
    brandCounts[item.model.brand] = count + 1;
  }
  for (const item of scored) {
    if (top.length >= Math.min(4, scored.length)) break;
    if (!top.includes(item)) top.push(item);
  }
  const ids = new Set(top.map((i) => i.model.id));
  return top.concat(scored.filter((i) => !ids.has(i.model.id)));
}

export function findUpgrades(catalogue: MonitorModel[], current: Screen, p: Preferences, desk: Desk, secondary: SecondaryContext): Recommendation[] {
  const scored = catalogue
    .filter((m) => passesFilters(m, current, p, desk, secondary))
    .map((m) => scoreModel(m, current, p, secondary))
    .sort((a, b) => b.score - a.score);
  return diversify(scored);
}

/** How many would match if the desk filter were off (for the "hidden by desk fit" message). */
export function countWithoutDeskFilter(catalogue: MonitorModel[], current: Screen, p: Preferences, desk: Desk, secondary: SecondaryContext): number {
  const relaxed = { ...p, fitDesk: false };
  return catalogue.filter((m) => passesFilters(m, current, relaxed, desk, secondary)).length;
}

export function upgradeReason(item: Recommendation, current: Screen, p: Preferences): string {
  const workspace = Math.round(item.workspaceGain * 100);
  const ppi = Math.round(item.ppiGain * 100);
  const size = Math.round(item.sizeGain * 100);
  const currentRefresh = current.model?.refresh ?? null;
  if (p.priority === "workspace") {
    return workspace >= 0
      ? `At the recommended ${item.metrics.scaling}% scaling, it gives you about ${workspace}% more usable main-screen workspace.`
      : "Its layout is better aligned to your other filters, although usable workspace is slightly lower.";
  }
  if (p.priority === "sharpness") return `Pixel density rises from about ${Math.round(current.ppi)} to ${Math.round(item.metrics.ppi)} PPI${ppi > 0 ? `, roughly ${ppi}% denser.` : "."}`;
  if (p.priority === "refresh") {
    return currentRefresh
      ? `Refresh rate moves from ${currentRefresh}Hz to ${item.model.refresh ?? "—"}Hz, while still matching your size and display filters.`
      : `${item.model.refresh ?? "—"}Hz makes this one of the stronger motion-focused options in the matching catalogue.`;
  }
  if (p.priority === "size") return `${item.model.size}" gives you ${Math.abs(size)}% ${size >= 0 ? "more" : "less"} diagonal screen size than your current main monitor.`;
  const positives: string[] = [];
  if (workspace >= 15) positives.push(`${workspace}% more usable workspace`);
  if (ppi >= 12) positives.push(`${Math.round(item.metrics.ppi)} PPI for sharper detail`);
  if (item.model.refresh && (!currentRefresh || item.model.refresh > currentRefresh)) positives.push(`${item.model.refresh}Hz refresh`);
  if (size >= 10) positives.push(`${item.model.size}" screen`);
  if (positives.length === 0) positives.push("a strong balance of size, resolution and panel characteristics");
  return `It combines ${positives.slice(0, 2).join(" with ")}.`;
}

export interface FitLabel {
  text: string;
  tight: boolean;
  over: boolean;
}

export function fitLabel(item: Recommendation, desk: Desk, secondary: SecondaryContext): FitLabel {
  const widthRemaining = desk.width - item.projectedDeskWidth;
  const heightRemaining = desk.shelf !== null ? desk.shelf - item.projectedDeskHeight : null;
  const overWidth = widthRemaining < 0;
  const overHeight = heightRemaining !== null && heightRemaining < 0;
  let label: FitLabel;
  if (overWidth && overHeight) label = { text: "Too wide & tall", tight: true, over: true };
  else if (overWidth) label = { text: "Too wide", tight: true, over: true };
  else if (overHeight) label = { text: "Too tall", tight: true, over: true };
  else {
    const widthTight = widthRemaining < desk.width * 0.1;
    const heightTight = heightRemaining !== null && desk.shelf !== null && heightRemaining < Math.max(3, desk.shelf * 0.08);
    label = widthTight || heightTight ? { text: heightTight ? "Tight shelf fit" : "Tight desk fit", tight: true, over: false } : { text: "Fits desk", tight: false, over: false };
  }
  const depth = candidateDepthInfo(item.model, secondary);
  if (depth.knownDepth > desk.depth) label = { text: (label.tight ? `${label.text} · ` : "") + "Stand too deep", tight: true, over: true };
  else if (!depth.verified) label = { ...label, text: (label.tight ? `${label.text} · ` : "Width/height fit · ") + "Depth unverified", tight: true };
  else if (desk.depth - depth.knownDepth < 10) label = { ...label, text: (label.tight ? `${label.text} · ` : "") + "Limited depth spare", tight: true };
  return label;
}
