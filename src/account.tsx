import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, initAuth, onSessionChange, sendMagicLink, signOut, takeAuthError, type Session } from "./lib/auth";
import * as api from "./lib/account";

interface AccountState {
  session: Session | null;
  ready: boolean;
  favourites: Set<string>;
  setups: api.SavedSetup[];
  /** Why the sign-in dialog was opened, shown as its subtitle. */
  signInReason: string | null;
  notice: string | null;
  openSignIn: (reason?: string) => void;
  closeSignIn: () => void;
  sendLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  toggleFavourite: (monitorId: string) => Promise<void>;
  saveSetup: (name: string, params: string) => Promise<void>;
  renameSetup: (id: string, name: string) => Promise<void>;
  deleteSetup: (id: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  dismissNotice: () => void;
}

const AccountContext = createContext<AccountState | null>(null);

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(getSession());
  const [ready, setReady] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [setups, setSetups] = useState<api.SavedSetup[]>([]);
  const [signInReason, setSignInReason] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const off = onSessionChange(setSession);
    initAuth().then((s) => {
      setSession(s);
      setReady(true);
      const error = takeAuthError();
      if (error) setNotice(`${error} Request a new sign-in link.`);
    });
    return off;
  }, []);

  // Load the user's data whenever someone signs in; clear it on sign-out.
  useEffect(() => {
    if (session) setSignInReason(null);
    if (!session) {
      setFavourites(new Set());
      setSetups([]);
      return;
    }
    let cancelled = false;
    Promise.all([api.listFavourites(), api.listSetups()])
      .then(([favs, list]) => {
        if (cancelled) return;
        setFavourites(new Set(favs));
        setSetups(list);
      })
      .catch((e: Error) => !cancelled && setNotice(e.message));
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const toggleFavourite = useCallback(
    async (monitorId: string) => {
      if (!session) {
        setSignInReason("Sign in to save monitors and come back to them later.");
        return;
      }
      const had = favourites.has(monitorId);
      // Update straight away, undo if the request fails.
      setFavourites((prev) => {
        const next = new Set(prev);
        had ? next.delete(monitorId) : next.add(monitorId);
        return next;
      });
      try {
        if (had) await api.removeFavourite(monitorId);
        else await api.addFavourite(session.user.id, monitorId);
      } catch (e) {
        setFavourites((prev) => {
          const next = new Set(prev);
          had ? next.add(monitorId) : next.delete(monitorId);
          return next;
        });
        setNotice((e as Error).message);
      }
    },
    [session, favourites],
  );

  const value = useMemo<AccountState>(
    () => ({
      session,
      ready,
      favourites,
      setups,
      signInReason,
      notice,
      openSignIn: (reason) => setSignInReason(reason ?? "Save monitors and setups to come back to them on any device."),
      closeSignIn: () => setSignInReason(null),
      sendLink: (email) => sendMagicLink(email),
      signOut: async () => {
        await signOut();
        setNotice("You're signed out.");
      },
      toggleFavourite,
      saveSetup: async (name, params) => {
        if (!session) {
          setSignInReason("Sign in to save this setup and reopen it on any device.");
          return;
        }
        const saved = await api.saveSetup(session.user.id, name, params);
        setSetups((prev) => [saved, ...prev]);
      },
      renameSetup: async (id, name) => {
        await api.renameSetup(id, name);
        setSetups((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
      },
      deleteSetup: async (id) => {
        await api.deleteSetup(id);
        setSetups((prev) => prev.filter((s) => s.id !== id));
      },
      deleteAccount: async () => {
        await api.deleteAccount();
        setNotice("Your account and everything saved with it has been deleted.");
      },
      dismissNotice: () => setNotice(null),
    }),
    [session, ready, favourites, setups, signInReason, notice, toggleFavourite],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
