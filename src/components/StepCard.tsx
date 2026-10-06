import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface Props {
  id: string;
  badge: ReactNode;
  badgeTone: "green" | "accent" | "amber";
  kicker: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** A step on the left. Folds to a one-line summary when not in use. */
export function StepCard({ id, badge, badgeTone, kicker, title, summary, open, onToggle, children }: Props) {
  return (
    <section className={`step${open ? " is-open" : ""}`} aria-labelledby={`${id}-title`}>
      <button type="button" className="step-head" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
        <span className={`step-badge tone-${badgeTone}`}>{badge}</span>
        <span className="step-titles">
          <span className="kicker">{kicker}</span>
          <span className="step-title" id={`${id}-title`}>{title}</span>
        </span>
        <span className="chev"><Icon name="chevron" /></span>
      </button>
      <div className="fold summary" data-open={!open}>
        <div><p className="step-summary">{summary}</p></div>
      </div>
      <div className="fold" data-open={open} id={`${id}-body`} inert={!open}>
        <div><div className="step-body">{children}</div></div>
      </div>
    </section>
  );
}
