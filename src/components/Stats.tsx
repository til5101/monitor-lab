import type { Setup } from "../lib/types";
import { compareStats } from "../lib/setup";

export function Stats({ current, next }: { current: Setup; next: Setup }) {
  const stats = compareStats(current, next);
  return (
    <div className="stats" aria-label="Key differences">
      {stats.map((s) => (
        <div className="stat" key={s.key}>
          <span className="stat-label">{s.label}</span>
          <div className="stat-figures">
            <strong className="mono">{s.next}</strong>
            <span className={`mono stat-change tone-${s.tone}`}>{s.change}</span>
          </div>
          <span className="stat-from">from {s.current}</span>
        </div>
      ))}
    </div>
  );
}
