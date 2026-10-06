import type { MonitorModel } from "./types";
import { supabaseConfig } from "./config";

const COLUMNS = [
  "id", "brand", "model", "display_name", "size_inches", "resolution_x", "resolution_y", "refresh_hz",
  "panel_type", "aspect_ratio", "curved", "curvature_r", "aliases", "manufacturer_url", "image_url",
  "verified_at", "hdmi_ports", "hdmi_version", "displayport_ports", "displayport_version",
  "displayport_out_ports", "usb_c_ports", "usb_c_video", "usb_c_power_delivery_w", "thunderbolt_ports",
  "thunderbolt_version", "usb_a_ports", "usb_b_upstream_ports", "ethernet", "ethernet_speed_mbps",
  "audio_out", "kvm", "speakers", "speaker_power_w", "webcam", "webcam_pop_up", "webcam_resolution",
  "microphone", "vesa_mount", "vesa_width_mm", "vesa_height_mm", "width_mm", "panel_height_mm",
  "height_with_stand_min_mm", "height_with_stand_max_mm", "depth_with_stand_mm",
  "webcam_extended_height_mm", "physical_dimensions_verified", "features_verified", "feature_notes",
].join(",");

type Row = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export function mapMonitorRecord(r: Row): MonitorModel {
  return {
    id: str(r.id),
    brand: str(r.brand),
    model: str(r.model),
    name: str(r.display_name),
    size: Number(r.size_inches),
    resolution: `${r.resolution_x}x${r.resolution_y}`,
    refresh: num(r.refresh_hz),
    panel: str(r.panel_type),
    shape: r.curved ? "Curved" : "Flat",
    curvature: (r.curvature_r as string) || null,
    aliases: Array.isArray(r.aliases) ? (r.aliases as string[]) : [],
    manufacturerUrl: str(r.manufacturer_url),
    imageUrl: str(r.image_url),
    verifiedAt: (r.verified_at as string) || null,
    hdmiPorts: num(r.hdmi_ports),
    hdmiVersion: str(r.hdmi_version),
    displayportPorts: num(r.displayport_ports),
    displayportVersion: str(r.displayport_version),
    displayportOutPorts: num(r.displayport_out_ports),
    usbCPorts: num(r.usb_c_ports),
    usbCVideo: r.usb_c_video === true,
    usbCPowerDeliveryW: num(r.usb_c_power_delivery_w),
    thunderboltPorts: num(r.thunderbolt_ports),
    thunderboltVersion: str(r.thunderbolt_version),
    usbAPorts: num(r.usb_a_ports),
    usbBUpstreamPorts: num(r.usb_b_upstream_ports),
    ethernet: r.ethernet === true,
    ethernetSpeedMbps: num(r.ethernet_speed_mbps),
    audioOut: r.audio_out === true,
    kvm: r.kvm === true,
    speakers: r.speakers === true,
    speakerPowerW: num(r.speaker_power_w),
    webcam: r.webcam === true,
    webcamPopUp: r.webcam_pop_up === true,
    webcamResolution: str(r.webcam_resolution),
    microphone: r.microphone === true,
    vesaMount: r.vesa_mount === true,
    vesaWidthMm: num(r.vesa_width_mm),
    vesaHeightMm: num(r.vesa_height_mm),
    widthMm: num(r.width_mm),
    panelHeightMm: num(r.panel_height_mm),
    heightWithStandMinMm: num(r.height_with_stand_min_mm),
    heightWithStandMaxMm: num(r.height_with_stand_max_mm),
    depthWithStandMm: num(r.depth_with_stand_mm),
    webcamExtendedHeightMm: num(r.webcam_extended_height_mm),
    physicalDimensionsVerified: r.physical_dimensions_verified === true,
    featuresVerified: r.features_verified === true,
    featureNotes: str(r.feature_notes),
  };
}

/** Loads every active monitor, ordered by brand then model. */
export async function loadCatalogue(signal?: AbortSignal): Promise<MonitorModel[]> {
  const { url, key } = supabaseConfig;
  const endpoint = `${url}/rest/v1/monitor_models?select=${COLUMNS}&active=eq.true&order=brand.asc,model.asc`;
  const response = await fetch(endpoint, { headers: { apikey: key, Accept: "application/json" }, signal });
  if (!response.ok) throw new Error(`Catalogue returned ${response.status}`);
  const rows = (await response.json()) as Row[];
  return rows.map(mapMonitorRecord);
}

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function searchText(m: MonitorModel): string {
  return normalise([m.brand, m.model, m.name, m.size, m.resolution, m.refresh, m.panel, m.shape, ...m.aliases].join(" "));
}

/** Same ranking as the original site: token matches, plus a bonus when brand+model contains the whole query. */
export function searchCatalogue(catalogue: MonitorModel[], query: string, limit = 8): MonitorModel[] {
  const clean = normalise(query);
  if (!clean) return catalogue.slice(0, 7);
  const tokens = clean.split(/\s+/);
  const compactQuery = clean.replace(/\s/g, "");
  return catalogue
    .map((model) => {
      const haystack = searchText(model);
      let score = 0;
      for (const token of tokens) if (haystack.includes(token)) score += token.length >= 4 ? 4 : 2;
      const compactModel = (model.brand + model.model).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (compactModel.includes(compactQuery)) score += 8;
      return { model, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.model.brand + a.model.model).localeCompare(b.model.brand + b.model.model))
    .slice(0, limit)
    .map((item) => item.model);
}
