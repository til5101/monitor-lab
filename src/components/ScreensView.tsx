import { memo } from "react";
import { useElementSize } from "../hooks";
import { workPreviewMarkup } from "../lib/workPreview";
import { contentDescription, setupHeightCM, setupTitle, setupWidthCM, workspaceLabel } from "../lib/setup";
import type { Screen, Setup } from "../lib/types";

interface Props {
  current: Setup;
  next: Setup;
  nextIsExample: boolean;
}

const GAP_CM = 2;
const STAND_RATIO = 0.16;

/** Both setups drawn side by side at one physical scale. */
export function ScreensView({ current, next, nextIsExample }: Props) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const widthC = setupWidthCM(current);
  const widthN = setupWidthCM(next);
  const tallest = Math.max(setupHeightCM(current), setupHeightCM(next));
  const columnGap = size.width < 560 ? 18 : 56;
  // Room for the stand and the captions under each setup.
  const captionSpace = size.width < 560 ? 64 : 78;
  const usableHeight = Math.max(40, size.height - captionSpace);
  const pxPerCM = size.width
    ? Math.max(0.5, Math.min((size.width - columnGap - 8) / (widthC + widthN), usableHeight / (tallest * (1 + STAND_RATIO))))
    : 0;

  return (
    <div className="screens" ref={ref} style={{ ["--gap" as string]: `${columnGap}px` }}>
      {pxPerCM > 0 && (
        <div className="screens-row">
          <SetupDrawing setup={current} pxPerCM={pxPerCM} label="Current" tone="current" />
          <SetupDrawing setup={next} pxPerCM={pxPerCM} label={nextIsExample ? "Example upgrade" : "New"} tone="new" />
        </div>
      )}
    </div>
  );
}

function SetupDrawing({ setup, pxPerCM, label, tone }: { setup: Setup; pxPerCM: number; label: string; tone: "current" | "new" }) {
  const standHeight = Math.max(10, setupHeightCM(setup) * STAND_RATIO * pxPerCM);
  return (
    <figure className={`setup-drawing tone-${tone}`}>
      <div className="setup-screens" style={{ gap: GAP_CM * pxPerCM }}>
        {setup.monitors.map((m) => (
          <div className="screen-unit" key={m.slot}>
            <DrawnScreen screen={m} pxPerCM={pxPerCM} />
            <div className="stand" style={{ height: standHeight, width: Math.max(14, Math.min(m.widthCM * 0.18, 18) * pxPerCM) }} />
          </div>
        ))}
      </div>
      <figcaption>
        <span className="kicker">{label}</span>
        <strong>{setupTitle(setup)}</strong>
        <span className="mono">{setup.monitors.length > 1 ? workspaceLabel(setup) : `${workspaceLabel(setup)} workspace`}</span>
        <span className="caption-note">{contentDescription(setup)}</span>
      </figcaption>
    </figure>
  );
}

const DrawnScreen = memo(function DrawnScreen({ screen, pxPerCM }: { screen: Screen; pxPerCM: number }) {
  const width = screen.widthCM * pxPerCM;
  const height = screen.heightCM * pxPerCM;
  const bezel = Math.max(2, Math.min(7, width * 0.012));
  const innerW = width - bezel * 2;
  const innerH = height - bezel * 2;
  const scale = innerW / screen.effectiveX;
  return (
    <div className="drawn-screen" style={{ width, height, padding: bezel }}>
      <div className="drawn-canvas" style={{ width: innerW, height: innerH }}>
        <div
          className="drawn-content"
          style={{ width: screen.effectiveX, height: screen.effectiveY, transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: workPreviewMarkup() }}
        />
      </div>
    </div>
  );
});
