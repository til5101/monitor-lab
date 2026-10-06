// Plain-English comparison cards. Wording and thresholds match the original page.
import type { Desk, Setup } from "./types";
import { setupDeskHeightCM, setupDeskWidthCM, setupDepthInfo, setupHasUnknownWebcamClearance, setupPhysicalArea, setupWorkspaceArea } from "./setup";

export interface Insight {
  kicker: string;
  marker: string;
  tone: "more" | "less" | "neutral" | "tight" | "layout";
  title: string;
  body: string;
}

const millions = (v: number) => `${(v / 1e6).toFixed(1)}M`;

export function buildInsights(current: Setup, next: Setup, desk: Desk): Insight[] {
  const out: Insight[] = [];

  const wsC = setupWorkspaceArea(current);
  const wsN = setupWorkspaceArea(next);
  const ws = (wsN / wsC - 1) * 100;
  if (ws > 5) out.push({ kicker: "Workspace", marker: "↑", tone: "more", title: `${Math.round(ws)}% more usable workspace`, body: `Across the full setup, effective workspace rises from ${millions(wsC)} to ${millions(wsN)} effective pixels.` });
  else if (ws < -5) out.push({ kicker: "Workspace", marker: "↓", tone: "less", title: `${Math.abs(Math.round(ws))}% less usable workspace`, body: `Across the full setup, effective workspace falls from ${millions(wsC)} to ${millions(wsN)} effective pixels.` });
  else out.push({ kicker: "Workspace", marker: "≈", tone: "neutral", title: "Usable workspace is almost unchanged", body: `The two setups are within ${Math.abs(Math.round(ws))}% of each other for total effective workspace.` });

  const ppiC = Math.round(current.primary.ppi);
  const ppiN = Math.round(next.primary.ppi);
  const ppi = (next.primary.ppi / current.primary.ppi - 1) * 100;
  if (ppi > 5) out.push({ kicker: "Sharpness", marker: "↑", tone: "more", title: `${Math.round(ppi)}% higher pixel density`, body: `Your main display moves from ${ppiC} to ${ppiN} PPI, so text and interface detail should appear noticeably crisper.` });
  else if (ppi < -5) out.push({ kicker: "Sharpness", marker: "↓", tone: "less", title: `${Math.abs(Math.round(ppi))}% lower pixel density`, body: `Your main display moves from ${ppiC} to ${ppiN} PPI, meaning pixels will be physically larger on the new screen.` });
  else out.push({ kicker: "Sharpness", marker: "≈", tone: "neutral", title: "Main-screen sharpness is very similar", body: `Pixel density changes only slightly, from ${ppiC} to ${ppiN} PPI.` });

  const areaC = setupPhysicalArea(current);
  const areaN = setupPhysicalArea(next);
  const area = (areaN / areaC - 1) * 100;
  if (area > 5) out.push({ kicker: "Physical size", marker: "+", tone: "more", title: `${Math.round(area)}% more physical screen area`, body: "The combined panel area is larger, so the new setup will occupy more physical space in front of you even before resolution is considered." });
  else if (area < -5) out.push({ kicker: "Physical size", marker: "−", tone: "less", title: `${Math.abs(Math.round(area))}% less physical screen area`, body: "The combined panel area is smaller, giving the proposed setup a more compact physical footprint." });
  else out.push({ kicker: "Physical size", marker: "≈", tone: "neutral", title: "Overall physical screen area is similar", body: `The combined panel area changes by only ${Math.abs(Math.round(area))}% between the two setups.` });

  out.push(deskInsight(current, next, desk));

  const secondary = next.monitors.find((m) => m.slot === "secondary");
  if (secondary && secondary.orientation === "portrait") {
    out.push({ kicker: "Layout", marker: "↕", tone: "layout", title: "Your second screen shifts space vertically", body: `In portrait, the secondary display provides ${secondary.effectiveY} effective pixels vertically, making more of long pages, documents and inboxes visible at once.` });
  } else if (current.mode === "single" && next.mode === "dual") {
    out.push({ kicker: "Layout", marker: "+", tone: "layout", title: "The new setup adds a second display", body: "Your workspace is split across two physical screens instead of one, which changes how applications can be separated across the desk." });
  } else if (current.mode === "dual" && next.mode === "single") {
    out.push({ kicker: "Layout", marker: "1", tone: "layout", title: "The new setup consolidates onto one display", body: "You move from two physical panels to one. The workspace figure shows whether the larger single display makes up for the removed second screen." });
  }
  return out;
}

function deskInsight(current: Setup, next: Setup, desk: Desk): Insight {
  const currentWidth = setupDeskWidthCM(current);
  const newWidth = setupDeskWidthCM(next);
  const newHeight = setupDeskHeightCM(next);
  const webcamUnknown = setupHasUnknownWebcamClearance(next);
  const remaining = desk.width - newWidth;
  const heightRemaining = desk.shelf !== null ? desk.shelf - newHeight : null;
  const depth = setupDepthInfo(next);
  const depthOver = depth.knownDepth > desk.depth;
  const widthDifference = newWidth - currentWidth;

  if (depthOver || remaining < 0 || (heightRemaining !== null && heightRemaining < 0)) {
    const issues: string[] = [];
    if (depthOver) issues.push(`${(depth.knownDepth - desk.depth).toFixed(1)} cm too deep`);
    if (remaining < 0) issues.push(`${Math.abs(remaining).toFixed(1)} cm too wide`);
    if (heightRemaining !== null && heightRemaining < 0) issues.push(`${Math.abs(heightRemaining).toFixed(1)} cm too tall for the shelf`);
    return {
      kicker: "Desk fit",
      marker: "!",
      tone: "tight",
      title: issues.join(" · "),
      body:
        `The proposed panels need about ${newWidth.toFixed(1)} cm of horizontal space and the tallest panel is about ${newHeight.toFixed(1)} cm high.` +
        (desk.shelf !== null ? ` Your entered shelf clearance is ${desk.shelf.toFixed(0)} cm.` : "") +
        (webcamUnknown ? " A selected monitor has a pop-up webcam whose deployed height is not separately published, so allow additional top clearance." : ""),
    };
  }

  let body = `The proposed panel footprint is about ${newWidth.toFixed(1)} cm across, leaving ${remaining.toFixed(1)} cm of desk width unused.`;
  body += depth.verified
    ? ` The stock stand needs ${depth.knownDepth.toFixed(1)} cm of depth, leaving ${(desk.depth - depth.knownDepth).toFixed(1)} cm front-to-back.`
    : " Stand depth is unverified, so the full desk fit cannot be confirmed.";
  if (heightRemaining !== null) body += ` The tallest panel is about ${newHeight.toFixed(1)} cm high, leaving ${heightRemaining.toFixed(1)} cm below the shelf.`;
  if (Math.abs(widthDifference) >= 1) body += ` The setup is ${Math.abs(widthDifference).toFixed(1)} cm ${widthDifference > 0 ? "wider" : "narrower"} than your current setup.`;
  if (webcamUnknown && heightRemaining !== null) body += " A pop-up webcam is present and needs some additional top clearance when deployed.";
  const tight = remaining < 8 || (heightRemaining !== null && heightRemaining < 3);
  return {
    kicker: "Desk fit",
    marker: tight ? "!" : "✓",
    tone: tight ? "tight" : "more",
    title: !depth.verified ? "Width/height fit · depth unverified" : heightRemaining !== null ? "Fits desk and shelf clearance" : `Fits with ${remaining.toFixed(1)} cm to spare`,
    body,
  };
}
