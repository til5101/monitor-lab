import type { MonitorModel } from "./types";

export interface Badge {
  text: string;
  kind?: "warning" | "webcam";
}

/** Ports and extras for a verified model, in the same order as the original page. */
export function featureBadges(model: MonitorModel | null, limit?: number): Badge[] {
  if (!model || !model.featuresVerified) return [];
  const b: Badge[] = [];
  const n = (v: number | null) => (v ?? 0) > 0;
  if (model.usbCVideo) b.push({ text: `USB-C video${model.usbCPowerDeliveryW ? ` · ${model.usbCPowerDeliveryW}W` : ""}` });
  else if (n(model.usbCPorts)) b.push({ text: `${model.usbCPorts}× USB-C` });
  if (model.kvm) b.push({ text: "KVM" });
  if (model.ethernet) {
    const speed = model.ethernetSpeedMbps;
    b.push({ text: speed ? `RJ45 · ${speed >= 1000 ? `${speed / 1000}GbE` : `${speed}Mb`}` : "RJ45" });
  }
  if (model.webcam) b.push({ text: model.webcamPopUp ? "Pop-up webcam" : "Webcam", kind: "webcam" });
  if (model.speakers) b.push({ text: model.speakerPowerW ? `Speakers · ${model.speakerPowerW}W total` : "Speakers" });
  if (n(model.hdmiPorts)) b.push({ text: `${model.hdmiPorts}× HDMI${model.hdmiVersion ? ` ${model.hdmiVersion}` : ""}` });
  if (n(model.displayportPorts)) b.push({ text: `${model.displayportPorts}× DP${model.displayportVersion ? ` ${model.displayportVersion}` : ""}` });
  if (n(model.displayportOutPorts)) b.push({ text: "DP out / daisy-chain" });
  if (n(model.thunderboltPorts)) b.push({ text: `Thunderbolt${model.thunderboltVersion ? ` ${model.thunderboltVersion}` : ""}` });
  if (n(model.usbAPorts)) b.push({ text: `${model.usbAPorts}× USB-A` });
  if (model.audioOut) b.push({ text: "Audio out" });
  if (model.microphone) b.push({ text: "Microphone" });
  if (model.vesaMount) b.push({ text: model.vesaWidthMm && model.vesaHeightMm ? `VESA ${model.vesaWidthMm}×${model.vesaHeightMm}` : "VESA mount" });
  if (model.webcamPopUp && !model.webcamExtendedHeightMm) b.push({ text: "Webcam needs extra top clearance", kind: "warning" });
  return limit === undefined ? b : b.slice(0, limit);
}

/** Things the current main screen has that the new one doesn't — the losses worth flagging. */
export function featureLosses(current: MonitorModel | null, next: MonitorModel | null): string[] {
  if (!current?.featuresVerified || !next?.featuresVerified) return [];
  const losses: string[] = [];
  if (current.kvm && !next.kvm) losses.push("KVM");
  if (current.ethernet && !next.ethernet) losses.push("Ethernet");
  if ((current.usbCVideo || (current.thunderboltPorts ?? 0) > 0) && !(next.usbCVideo || (next.thunderboltPorts ?? 0) > 0)) losses.push("USB-C video");
  if (current.webcam && !next.webcam) losses.push("Webcam");
  if (current.speakers && !next.speakers) losses.push("Speakers");
  if ((current.displayportOutPorts ?? 0) > 0 && !((next.displayportOutPorts ?? 0) > 0)) losses.push("DP daisy-chain");
  if ((current.usbAPorts ?? 0) > 0 && !((next.usbAPorts ?? 0) > 0)) losses.push("USB hub");
  return losses;
}
