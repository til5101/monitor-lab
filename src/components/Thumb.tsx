import { useState } from "react";
import type { MonitorModel } from "../lib/types";

/** Product photo from the catalogue's image_url. Falls back to a drawn monitor if there's no image or it fails to load. */
export function Thumb({ model, size = "md" }: { model: MonitorModel; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const src = model.imageUrl && !failed ? model.imageUrl : null;
  return (
    <span className={`thumb is-${size}${src ? "" : " is-placeholder"}`} aria-hidden="true">
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="thumb-screen" />
      )}
    </span>
  );
}
