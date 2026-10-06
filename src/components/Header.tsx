import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, Logo } from "./Icon";

const STEPS = ["Current", "Upgrade", "Compare"];

interface Props {
  progress: number;
  canShare: boolean;
  shareUrl: () => string;
  account?: ReactNode;
}

export function Header({ progress, canShare, shareUrl, account }: Props) {
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
      <div className="topbar-actions">
        {canShare && <ShareButton shareUrl={shareUrl} />}
        {account}
      </div>
    </header>
  );
}

function ShareButton({ shareUrl }: { shareUrl: () => string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "copied") {
      const t = setTimeout(() => setStatus("idle"), 2200);
      return () => clearTimeout(t);
    }
    if (status === "manual") inputRef.current?.select();
  }, [status]);

  async function share() {
    const link = shareUrl();
    setUrl(link);
    try {
      window.history.replaceState(null, "", link);
    } catch {
      /* not allowed in some embeds */
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }

  return (
    <div className="share">
      <button type="button" className="ghost-button" onClick={share}>
        <Icon name={status === "copied" ? "check" : "share"} />
        <span>{status === "copied" ? "Link copied" : "Share"}</span>
      </button>
      {status === "manual" && (
        <div className="share-pop" role="dialog" aria-label="Share link">
          <label className="field-label" htmlFor="share-url">Copy this link</label>
          <input id="share-url" ref={inputRef} readOnly value={url} onFocus={(e) => e.target.select()} />
          <button type="button" className="text-button" onClick={() => setStatus("idle")}>Done</button>
        </div>
      )}
    </div>
  );
}
