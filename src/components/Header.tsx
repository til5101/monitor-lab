import { Icon, Logo } from "./Icon";

const STEPS = ["Current", "Upgrade", "Compare"];

export function Header({ progress }: { progress: number }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Monitor Lab home">
        <Logo />
        <span>Monitor Lab</span>
      </a>
      <ol className="progress" aria-label="Progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < progress ? "done" : n === progress ? "active" : "todo";
          return (
            <li key={label} className={`is-${state}`} aria-current={state === "active" ? "step" : undefined}>
              <span className="progress-dot">{state === "done" ? <Icon name="check" size={12} /> : n}</span>
              <span className="progress-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
