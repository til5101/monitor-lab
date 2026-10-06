/** A monitor from the Supabase catalogue (`monitor_models`), mapped to camelCase. */
export interface MonitorModel {
  id: string;
  brand: string;
  model: string;
  name: string;
  size: number;
  /** "2560x1440" */
  resolution: string;
  refresh: number | null;
  panel: string;
  shape: "Curved" | "Flat";
  curvature: string | null;
  aliases: string[];
  manufacturerUrl: string;
  imageUrl: string;
  verifiedAt: string | null;
  hdmiPorts: number | null;
  hdmiVersion: string;
  displayportPorts: number | null;
  displayportVersion: string;
  displayportOutPorts: number | null;
  usbCPorts: number | null;
  usbCVideo: boolean;
  usbCPowerDeliveryW: number | null;
  thunderboltPorts: number | null;
  thunderboltVersion: string;
  usbAPorts: number | null;
  usbBUpstreamPorts: number | null;
  ethernet: boolean;
  ethernetSpeedMbps: number | null;
  audioOut: boolean;
  kvm: boolean;
  speakers: boolean;
  speakerPowerW: number | null;
  webcam: boolean;
  webcamPopUp: boolean;
  webcamResolution: string;
  microphone: boolean;
  vesaMount: boolean;
  vesaWidthMm: number | null;
  vesaHeightMm: number | null;
  widthMm: number | null;
  panelHeightMm: number | null;
  heightWithStandMinMm: number | null;
  heightWithStandMaxMm: number | null;
  depthWithStandMm: number | null;
  webcamExtendedHeightMm: number | null;
  physicalDimensionsVerified: boolean;
  featuresVerified: boolean;
  featureNotes: string;
}

export type Orientation = "landscape" | "portrait";
export type Side = "left" | "right";
export type Mode = "single" | "dual";
export type Prefix = "current" | "new";
export type Slot = "primary" | "secondary";

/** What the user has chosen for one screen. A chosen catalogue model overrides size and resolution. */
export interface ScreenInput {
  size: number;
  resolution: string;
  scaling: number;
  orientation: Orientation;
  modelId: string | null;
}

export interface SetupInput {
  mode: Mode;
  primary: ScreenInput;
  secondary: ScreenInput;
  /** Which side of the main screen the second screen sits on. */
  position: Side;
}

export interface Desk {
  width: number;
  depth: number;
  /** Shelf clearance above the desktop, if any. */
  shelf: number | null;
}

/** A screen with every derived measurement worked out. */
export interface Screen {
  slot: Slot;
  size: number;
  orientation: Orientation;
  pixelsX: number;
  pixelsY: number;
  nativePixelsX: number;
  nativePixelsY: number;
  scaling: number;
  effectiveX: number;
  effectiveY: number;
  /** Panel size worked out from the diagonal. */
  widthCM: number;
  heightCM: number;
  /** Physical body size, from verified dimensions where available. */
  deskWidthCM: number;
  deskHeightCM: number;
  bodyHeightCM: number;
  physicalDimensionsVerified: boolean;
  webcamClearanceUnknown: boolean;
  ppi: number;
  model: MonitorModel | null;
}

export interface Setup {
  prefix: Prefix;
  mode: Mode;
  primary: Screen;
  /** Left to right as they sit on the desk. */
  monitors: Screen[];
  secondaryPosition: Side;
}
