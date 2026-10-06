// Email magic-link sign-in against Supabase Auth, without the supabase-js dependency.
// The link returns to the site with the session in the URL hash (implicit flow);
// we store it, strip it from the address bar and refresh it before it expires.
import { supabaseConfig } from "./config";

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  user: { id: string; email: string };
}

type Listener = (session: Session | null) => void;

const STORAGE_KEY = "monitorLabSession";
const listeners = new Set<Listener>();
let session: Session | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let lastAuthError: string | null = null;

function headers(token?: string): Record<string, string> {
  return {
    apikey: supabaseConfig.key,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function store(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode: session lasts for this tab only */
  }
  clearTimeout(refreshTimer);
  if (next) {
    // Refresh a minute before expiry.
    const ms = Math.max(5_000, (next.expiresAt - 60) * 1000 - Date.now());
    refreshTimer = setTimeout(() => void refresh(), ms);
  }
  listeners.forEach((l) => l(next));
}

function decodeUser(accessToken: string): { id: string; email: string } | null {
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ? { id: payload.sub, email: payload.email ?? "" } : null;
  } catch {
    return null;
  }
}

/** Call once on start-up. Picks up a session from a sign-in link or from storage. */
export async function initAuth(): Promise<Session | null> {
  // A link opened in a tab that already has the site loaded only changes the hash.
  window.addEventListener("hashchange", () => {
    if (/access_token=|error=/.test(window.location.hash)) void initAuth();
  }, { once: true });
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (hash.has("access_token") || hash.has("error")) {
    // Remove tokens from the address bar straight away.
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (hash.has("error")) {
      lastAuthError = hash.get("error_description")?.replace(/\+/g, " ") ?? "That sign-in link didn't work.";
    } else {
      const accessToken = hash.get("access_token") as string;
      const user = decodeUser(accessToken);
      if (user) {
        store({
          accessToken,
          refreshToken: hash.get("refresh_token") ?? "",
          expiresAt: Number(hash.get("expires_at")) || Math.floor(Date.now() / 1000) + Number(hash.get("expires_in") || 3600),
          user,
        });
        return session;
      }
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Session;
      if (saved.expiresAt * 1000 > Date.now() + 30_000) store(saved);
      else if (saved.refreshToken) {
        session = saved;
        await refresh();
      }
    }
  } catch {
    /* ignore unreadable storage */
  }
  return session;
}

/** A message to show once, e.g. after an expired sign-in link. */
export function takeAuthError(): string | null {
  const e = lastAuthError;
  lastAuthError = null;
  return e;
}

export function getSession(): Session | null {
  return session;
}

export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function refresh(): Promise<void> {
  if (!session?.refreshToken) return store(null);
  try {
    const res = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    store({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at ?? Math.floor(Date.now() / 1000) + data.expires_in,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch {
    store(null);
  }
}

/** Sends the sign-in email. The link brings the person back to this page. */
export async function sendMagicLink(email: string): Promise<void> {
  const redirect = window.location.origin + window.location.pathname + window.location.search;
  const res = await fetch(`${supabaseConfig.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Too many sign-in emails. Wait a minute and try again.");
    let message = "We couldn't send the email. Check the address and try again.";
    try {
      const data = await res.json();
      if (typeof data.msg === "string" && /email/i.test(data.msg)) message = data.msg;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
}

export async function signOut(): Promise<void> {
  const token = session?.accessToken;
  store(null);
  if (token) await fetch(`${supabaseConfig.url}/auth/v1/logout`, { method: "POST", headers: headers(token) }).catch(() => undefined);
}

/** Authorised request to the database API for the signed-in user. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (session && session.expiresAt * 1000 < Date.now() + 30_000) await refresh();
  if (!session) throw new Error("Sign in first.");
  return fetch(`${supabaseConfig.url}${path}`, {
    ...init,
    headers: { ...headers(session.accessToken), ...(init.headers as Record<string, string> | undefined) },
  });
}

export function clearLocalSession() {
  store(null);
}
