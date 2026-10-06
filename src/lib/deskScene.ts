// Perspective desk illustration. Ported from the original page's renderDeskSetup.
// Both setups share one projection and scale so their sizes compare honestly.
import type { Desk, Setup } from "./types";
import { deskFit, modelDeskDimensions, monitorStandDepth, setupDeskHeightCM, setupDeskWidthCM, setupDepthInfo } from "./setup";

export interface Scene {
  height: number;
  top: number;
  scale: number;
}

export function sharedScene(current: Setup, next: Setup, desk: Desk): Scene {
  const widest = Math.max(desk.width, setupDeskWidthCM(current), setupDeskWidthCM(next));
  const tallest = Math.max(setupDeskHeightCM(current), setupDeskHeightCM(next), desk.shelf ?? 0);
  const maxDepth = Math.max(desk.depth, setupDepthInfo(current).knownDepth, setupDepthInfo(next).knownDepth, 25);
  return { height: tallest, top: 38, scale: Math.min(440 / (widest + 0.28 * maxDepth), 300 / (tallest + 0.38 * maxDepth + 30)) };
}

export function deskSceneSvg(setup: Setup, id: string, label: string, scene: Scene, desk: Desk): string {
  const fit = deskFit(setup, desk);
  const d = desk.depth;
  const deskWidth = desk.width;
  const deskHeight = desk.shelf;
  const width = setupDeskWidthCM(setup);
  const scale = scene.scale;
  const point = (x: number, y: number, z: number): [number, number] => [300 + (x + 0.28 * (y - d / 2)) * scale, scene.top + (scene.height - z + 0.38 * y) * scale];
  type V = [number, number, number];
  const pts = (vs: V[]) => vs.map((v) => point(...v).map((n) => n.toFixed(2)).join(",")).join(" ");
  const polygon = (v: V[], fill: string, stroke = "#344354") => `<polygon points="${pts(v)}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`;
  const line = (a: V, b: V, color = "#8192ab", dash = "") => {
    const p = point(...a);
    const q = point(...b);
    return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${color}" stroke-width="1" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
  };
  const text = (v: V, t: string, anchor = "middle", dy = 0) => {
    const p = point(...v);
    return `<text x="${p[0]}" y="${p[1] + dy}" text-anchor="${anchor}" class="scene-label">${t}</text>`;
  };
  const half = deskWidth / 2;
  const edge = fit.over ? "#e69879" : "#667d99";
  const screenTint = id.endsWith("new") ? "#6976e8" : "#4c91ac";
  let svg = `<svg class="desk-scene" viewBox="0 0 600 390" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${label} on a ${deskWidth} by ${d} cm desk</title><desc id="${id}-d">Perspective illustration of ${setup.monitors.length} monitor${setup.monitors.length === 1 ? "" : "s"}. ${fit.parts.join(". ")}. Stand shapes and screen positions are illustrative.</desc><defs><linearGradient id="${id}-top" x2="0" y2="1"><stop stop-color="#526278"/><stop offset="1" stop-color="#303f52"/></linearGradient><linearGradient id="${id}-screen" x2="1" y2="1"><stop stop-color="${screenTint}"/><stop offset="1" stop-color="#14273c"/></linearGradient></defs>`;
  for (const x of [-half + 5, half - 5]) {
    for (const y of [5, d - 5]) {
      svg += polygon([[x - 1.5, y, -3], [x + 1.5, y, -3], [x + 1.5, y, -27], [x - 1.5, y, -27]], "#202b39");
      svg += polygon([[x + 1.5, y, -3], [x + 1.5, y + 3, -3], [x + 1.5, y + 3, -27], [x + 1.5, y, -27]], "#141c28");
    }
  }
  svg += polygon([[-half, 0, 0], [half, 0, 0], [half, d, 0], [-half, d, 0]], `url(#${id}-top)`, edge);
  svg += polygon([[-half, d, 0], [half, d, 0], [half, d, -3], [-half, d, -3]], "#293546", edge);
  svg += polygon([[half, 0, 0], [half, d, 0], [half, d, -3], [half, 0, -3]], "#1d2836", edge);
  for (let y = 10; y < d; y += 10) svg += line([-half, y, 0.1], [half, y, 0.1], "#60738a44");
  let cursor = -width / 2;
  for (const m of setup.monitors) {
    const physical = modelDeskDimensions(m.model, m.orientation, m.widthCM, m.heightCM);
    const w = physical.widthCM;
    const h = physical.bodyHeightCM;
    const known = monitorStandDepth(m.model);
    const footprint = known === null ? 25 : known;
    const cx = cursor + w / 2;
    const screenY = Math.min(footprint * 0.42, 16);
    const bottom = Math.max(0, physical.requiredHeightCM - h);
    const baseWidth = Math.min(w * 0.45, 25);
    const standEdge = known !== null && known > d ? "#ee9f7f" : "#708097";
    svg += polygon([[cx - baseWidth / 2, 0, 0.5], [cx + baseWidth / 2, 0, 0.5], [cx + baseWidth / 2, footprint, 0.5], [cx - baseWidth / 2, footprint, 0.5]], "#1b2634", standEdge);
    svg += polygon([[cx - 1.5, screenY, 1], [cx + 1.5, screenY, 1], [cx + 1.5, screenY, bottom + h * 0.35], [cx - 1.5, screenY, bottom + h * 0.35]], "#69788c");
    svg += polygon([[cursor, screenY, bottom], [cursor + w, screenY, bottom], [cursor + w, screenY, bottom + h], [cursor, screenY, bottom + h]], "#0b1320", "#6b7c95");
    svg += polygon([[cursor + w, screenY, bottom], [cursor + w, screenY + 2, bottom], [cursor + w, screenY + 2, bottom + h], [cursor + w, screenY, bottom + h]], "#26364a");
    svg += polygon([[cursor + 1, screenY - 0.1, bottom + 1], [cursor + w - 1, screenY - 0.1, bottom + 1], [cursor + w - 1, screenY - 0.1, bottom + h - 1], [cursor + 1, screenY - 0.1, bottom + h - 1]], `url(#${id}-screen)`, "#20304b");
    svg += polygon([[cursor + w * 0.1, screenY - 0.2, bottom + h * 0.18], [cursor + w * 0.55, screenY - 0.2, bottom + h * 0.18], [cursor + w * 0.55, screenY - 0.2, bottom + h * 0.72], [cursor + w * 0.1, screenY - 0.2, bottom + h * 0.72]], "#c7ddff22", "#c7ddff33");
    svg += polygon([[cursor + w * 0.6, screenY - 0.2, bottom + h * 0.18], [cursor + w * 0.9, screenY - 0.2, bottom + h * 0.18], [cursor + w * 0.9, screenY - 0.2, bottom + h * 0.72], [cursor + w * 0.6, screenY - 0.2, bottom + h * 0.72]], "#d8eaff15", "#c7ddff22");
    cursor += w + 2;
  }
  if (deskHeight !== null) {
    svg += line([-half, 0, deskHeight], [half, 0, deskHeight], fit.overHeight ? "#ee9f7f" : "#b0a5dd", "4 3");
    svg += text([0, 0, deskHeight], `${deskHeight} cm shelf clearance`, "middle", -10);
  }
  svg += line([-half, d, -10], [half, d, -10]);
  svg += text([0, d, -10], `${deskWidth} cm wide`, "middle", 16);
  svg += line([half + 6, 0, 0], [half + 6, d, 0]);
  svg += text([half + 7, d / 2, 0], `${d} cm`, "start", -4);
  return `${svg}</svg>`;
}
