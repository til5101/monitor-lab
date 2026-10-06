import { useEffect, useId, useRef, useState } from "react";
import { useAccount } from "../account";
import type { MonitorModel } from "../lib/types";
import { modelMetaText } from "../lib/setup";
import { Icon } from "./Icon";
import { Thumb } from "./Thumb";

/** Heart toggle for a catalogue model. Signed-out users are asked to sign in. */
export function HeartButton({ model, dark }: { model: MonitorModel; dark?: boolean }) {
  const { favourites, toggleFavourite } = useAccount();
  const saved = favourites.has(model.id);
  return (
    <button
      type="button"
      className={`heart-button${saved ? " is-saved" : ""}${dark ? " is-dark" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${model.brand} ${model.model} from saved` : `Save ${model.brand} ${model.model}`}
      onClick={() => void toggleFavourite(model.id)}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    </button>
  );
}

export function SignInDialog() {
  const { signInReason, closeSignIn, sendLink } = useAccount();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (signInReason) {
      setStatus("idle");
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [signInReason]);

  useEffect(() => {
    if (!signInReason) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSignIn();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signInReason, closeSignIn]);

  if (!signInReason) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeSignIn()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <button type="button" className="icon-button modal-close" aria-label="Close" onClick={closeSignIn}>
          <Icon name="close" />
        </button>
        {status === "sent" ? (
          <div className="modal-body">
            <span className="modal-icon" aria-hidden="true">✉</span>
            <h2 id={`${id}-title`}>Check your inbox</h2>
            <p>
              We've sent a sign-in link to <strong>{email}</strong>. Open it on this device and you'll come straight back here, signed in.
            </p>
            <p className="hint">It can take a minute. Check your junk folder if it hasn't arrived.</p>
            <button type="button" className="text-button" onClick={() => setStatus("idle")}>Use a different email</button>
          </div>
        ) : (
          <form
            className="modal-body"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setStatus("sending");
              try {
                await sendLink(email.trim());
                setStatus("sent");
              } catch (err) {
                setError((err as Error).message);
                setStatus("idle");
              }
            }}
          >
            <h2 id={`${id}-title`}>Sign in to Monitor Lab</h2>
            <p>{signInReason}</p>
            <label className="field">
              <span className="field-label">Email address</span>
              <input
                ref={inputRef}
                className="text-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="primary-button" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            <p className="hint">No password needed. New here? The same link creates your account. See how we handle your email in our <a href="/privacy" target="_blank" rel="noreferrer">privacy notice</a>.</p>
          </form>
        )}
      </div>
    </div>
  );
}

export function AccountButton({ onOpenSaved }: { onOpenSaved: () => void }) {
  const { session, ready, openSignIn, favourites, setups } = useAccount();
  if (!ready) return null;
  if (!session) {
    return (
      <button type="button" className="dark-button" onClick={() => openSignIn()}>
        Sign in
      </button>
    );
  }
  const count = favourites.size + setups.length;
  return (
    <button type="button" className="ghost-button" onClick={onOpenSaved} aria-label={`Saved: ${count} items`}>
      <Icon name="heart" />
      <span>Saved</span>
      <span className="mono count">{count}</span>
    </button>
  );
}

export function Notice() {
  const { notice, dismissNotice } = useAccount();
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismissNotice, 6000);
    return () => clearTimeout(t);
  }, [notice, dismissNotice]);
  if (!notice) return null;
  return (
    <div className="toast" role="status">
      <span>{notice}</span>
      <button type="button" className="text-button" onClick={dismissNotice}>OK</button>
    </div>
  );
}

interface SavedPanelProps {
  open: boolean;
  onClose: () => void;
  catalogue: MonitorModel[];
  onUseMonitor: (model: MonitorModel) => void;
  onOpenSetup: (params: string) => void;
}

export function SavedPanel({ open, onClose, catalogue, onUseMonitor, onOpenSetup }: SavedPanelProps) {
  const { session, favourites, setups, renameSetup, deleteSetup, signOut, deleteAccount } = useAccount();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const models = catalogue.filter((m) => favourites.has(m.id));

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setEditing(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !session) return null;
  return (
    <div className="modal-backdrop is-side" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="saved-panel" role="dialog" aria-modal="true" aria-label="Saved">
        <div className="saved-head">
          <div>
            <span className="kicker">Signed in</span>
            <strong>{session.user.email}</strong>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="saved-scroll">
          <section>
            <h2 className="panel-title flush">Saved setups</h2>
            {setups.length === 0 && <p className="muted">Use "Save setup" on the comparison to keep a setup here.</p>}
            <ul className="saved-list">
              {setups.map((s) => (
                <li key={s.id}>
                  {editing === s.id ? (
                    <form
                      className="rename"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (draft.trim()) await renameSetup(s.id, draft.trim().slice(0, 80));
                        setEditing(null);
                      }}
                    >
                      <input className="text-input" value={draft} maxLength={80} autoFocus onChange={(e) => setDraft(e.target.value)} aria-label="Setup name" />
                      <button type="submit" className="text-button">Save</button>
                    </form>
                  ) : (
                    <>
                      <button type="button" className="saved-item" onClick={() => { onOpenSetup(s.params); onClose(); }}>
                        <strong>{s.name}</strong>
                        <span>Saved {new Date(s.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      </button>
                      <button type="button" className="text-button" onClick={() => { setEditing(s.id); setDraft(s.name); }}>Rename</button>
                      <button type="button" className="text-button danger" onClick={() => void deleteSetup(s.id)} aria-label={`Delete ${s.name}`}>Delete</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="panel-title flush">Saved monitors</h2>
            {models.length === 0 && <p className="muted">Tap the heart on any monitor to save it here.</p>}
            <ul className="saved-list">
              {models.map((m) => (
                <li key={m.id}>
                  <Thumb model={m} size="sm" />
                  <button type="button" className="saved-item" onClick={() => { onUseMonitor(m); onClose(); }}>
                    <strong>{m.brand} {m.model}</strong>
                    <span>{modelMetaText(m)}</span>
                  </button>
                  <HeartButton model={m} />
                </li>
              ))}
            </ul>
          </section>

          <section className="account-actions">
            <button type="button" className="secondary-button" onClick={() => { void signOut(); onClose(); }}>Sign out</button>
            <a className="text-button" href="/privacy" target="_blank" rel="noreferrer">Privacy notice</a>
            {confirmDelete ? (
              <div className="confirm">
                <p>Delete your account, saved monitors and saved setups? This can't be undone.</p>
                <div className="confirm-row">
                  <button type="button" className="secondary-button" onClick={() => setConfirmDelete(false)}>Keep my account</button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await deleteAccount();
                        onClose();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Deleting…" : "Delete everything"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="text-button danger" onClick={() => setConfirmDelete(true)}>Delete my account</button>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

/** "Save setup" on the comparison: names the setup inline, then saves it. */
export function SaveSetupButton({ defaultName, params }: { defaultName: string; params: () => string }) {
  const { session, saveSetup, openSignIn } = useAccount();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(defaultName);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(t);
  }, [state]);

  if (naming) {
    return (
      <form
        className="save-name"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("saving");
          try {
            await saveSetup(name.trim().slice(0, 80) || defaultName, params());
            setState("saved");
            setNaming(false);
          } catch {
            setState("idle");
          }
        }}
      >
        <input className="text-input dark" value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} aria-label="Name this setup" />
        <button type="submit" className="stage-button is-accent" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save"}</button>
        <button type="button" className="stage-button" onClick={() => setNaming(false)}>Cancel</button>
      </form>
    );
  }
  return (
    <button
      type="button"
      className="stage-button"
      onClick={() => {
        if (!session) return openSignIn("Sign in to save this setup and reopen it on any device.");
        setName(defaultName);
        setNaming(true);
      }}
    >
      <Icon name={state === "saved" ? "check" : "heart"} />
      <span>{state === "saved" ? "Saved" : "Save setup"}</span>
    </button>
  );
}
