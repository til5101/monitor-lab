// What's on the back of a monitor, grouped for drawing, plus a gain/loss comparison between two models.
import type { MonitorModel } from "./types";

export type PortKind = "hdmi" | "dp" | "dpout" | "tb" | "usbc" | "usbb" | "usba" | "rj45" | "audio";

export interface PortGroup {
  kind: PortKind;
  count: number;
  label: string;
  /** Version, speed or what the port carries. */
  detail: string;
  /** Inputs that carry a picture, so worth emphasising. */
  video: boolean;
}

export interface Extra {
  key: "kvm" | "speakers" | "webcam" | "microphone" | "ethernet" | "vesa";
  label: string;
  on: boolean;
  detail: string;
}

const n = (v: number | null | undefined) => (typeof v === "number" && v > 0 ? v : 0);

export function portGroups(m: MonitorModel): PortGroup[] {
  const groups: PortGroup[] = [];
  const tb = n(m.thunderboltPorts);
  const usbc = n(m.usbCPorts);
  const watts = n(m.usbCPowerDeliveryW);
  const charge = m.usbCVideo && watts ? ` · ${watts}W` : "";
  if (n(m.hdmiPorts)) groups.push({ kind: "hdmi", count: n(m.hdmiPorts), label: "HDMI", detail: m.hdmiVersion, video: true });
  if (n(m.displayportPorts)) groups.push({ kind: "dp", count: n(m.displayportPorts), label: "DisplayPort", detail: m.displayportVersion, video: true });
  if (tb) groups.push({ kind: "tb", count: tb, label: "Thunderbolt", detail: `${m.thunderboltVersion ? `TB${m.thunderboltVersion.replace(/^TB\s*/i, "")}` : ""}${charge}`.replace(/^ · /, ""), video: true });
  if (usbc) {
    const video = m.usbCVideo && !tb;
    groups.push({ kind: "usbc", count: usbc, label: "USB-C", detail: video ? `video${charge}` : "data", video });
  }
  if (n(m.displayportOutPorts)) groups.push({ kind: "dpout", count: n(m.displayportOutPorts), label: "DP out", detail: "daisy-chain", video: false });
  if (n(m.usbBUpstreamPorts)) groups.push({ kind: "usbb", count: n(m.usbBUpstreamPorts), label: "USB-B", detail: "to PC", video: false });
  if (n(m.usbAPorts)) groups.push({ kind: "usba", count: n(m.usbAPorts), label: "USB-A", detail: "hub", video: false });
  if (m.ethernet) {
    const s = n(m.ethernetSpeedMbps);
    groups.push({ kind: "rj45", count: 1, label: "Ethernet", detail: s ? (s >= 1000 ? `${s / 1000}GbE` : `${s}Mb`) : "", video: false });
  }
  if (m.audioOut) groups.push({ kind: "audio", count: 1, label: "Audio", detail: "3.5mm", video: false });
  return groups;
}

export function extras(m: MonitorModel): Extra[] {
  return [
    { key: "kvm", label: "KVM switch", on: m.kvm, detail: m.kvm ? "2 computers" : "" },
    { key: "ethernet", label: "Ethernet", on: m.ethernet, detail: m.ethernet ? (n(m.ethernetSpeedMbps) ? (n(m.ethernetSpeedMbps) >= 1000 ? `${n(m.ethernetSpeedMbps) / 1000}GbE` : `${m.ethernetSpeedMbps}Mb`) : "Built in") : "" },
    { key: "speakers", label: "Speakers", on: m.speakers, detail: n(m.speakerPowerW) ? `${m.speakerPowerW}W total` : "" },
    { key: "webcam", label: m.webcamPopUp ? "Pop-up webcam" : "Webcam", on: m.webcam, detail: m.webcamResolution },
    { key: "microphone", label: "Microphone", on: m.microphone, detail: "" },
    { key: "vesa", label: "VESA mount", on: m.vesaMount, detail: m.vesaWidthMm && m.vesaHeightMm ? `${m.vesaWidthMm} × ${m.vesaHeightMm}` : "" },
  ];
}

export interface LaptopLink {
  oneCable: boolean;
  text: string;
}

export function laptopLink(m: MonitorModel): LaptopLink {
  const oneCable = m.usbCVideo || n(m.thunderboltPorts) > 0;
  const watts = n(m.usbCPowerDeliveryW);
  if (!oneCable) return { oneCable, text: "Laptops connect by HDMI or DisplayPort and need their own charger." };
  return {
    oneCable,
    text: watts ? `One cable to a laptop: picture, USB and up to ${watts}W charging.` : "One cable to a laptop for picture and USB. Charging not listed.",
  };
}

export interface PortChange {
  text: string;
  tone: "gain" | "loss";
}

/** What the new monitor adds or drops compared with the current one. Both must be verified. */
export function portChanges(current: MonitorModel | null, next: MonitorModel | null): PortChange[] | null {
  if (!current?.featuresVerified || !next?.featuresVerified) return null;
  const out: PortChange[] = [];
  const count = (label: string, a: number, b: number) => {
    if (b > a) out.push({ text: `+${b - a} ${label}`, tone: "gain" });
    else if (b < a) out.push({ text: `${b - a} ${label}`, tone: "loss" });
  };
  const flag = (label: string, a: boolean, b: boolean) => {
    if (b && !a) out.push({ text: `Adds ${label}`, tone: "gain" });
    else if (a && !b) out.push({ text: `No ${label}`, tone: "loss" });
  };
  const a = laptopLink(current).oneCable;
  const b = laptopLink(next).oneCable;
  flag("one-cable laptop", a, b);
  if (a && b) {
    const wa = n(current.usbCPowerDeliveryW);
    const wb = n(next.usbCPowerDeliveryW);
    if (wb > wa) out.push({ text: `Charging ${wa ? `${wa}W → ` : "up to "}${wb}W`, tone: "gain" });
    else if (wb < wa) out.push({ text: `Charging ${wa}W → ${wb || "none"}${wb ? "W" : ""}`, tone: "loss" });
  }
  count("HDMI", n(current.hdmiPorts), n(next.hdmiPorts));
  count("DisplayPort", n(current.displayportPorts), n(next.displayportPorts));
  count("USB-C", n(current.usbCPorts) + n(current.thunderboltPorts), n(next.usbCPorts) + n(next.thunderboltPorts));
  count("USB-A", n(current.usbAPorts), n(next.usbAPorts));
  flag("daisy-chain", n(current.displayportOutPorts) > 0, n(next.displayportOutPorts) > 0);
  flag("KVM", current.kvm, next.kvm);
  flag("Ethernet", current.ethernet, next.ethernet);
  flag("speakers", current.speakers, next.speakers);
  flag("webcam", current.webcam, next.webcam);
  flag("microphone", current.microphone, next.microphone);
  flag("audio out", current.audioOut, next.audioOut);
  return out;
}
