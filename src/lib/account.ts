// Favourites and saved setups for the signed-in user. Row-level security on the
// database limits every request to the user's own rows.
import { authedFetch, clearLocalSession } from "./auth";

export interface SavedSetup {
  id: string;
  name: string;
  /** The comparison as a share-link query string. */
  params: string;
  updated_at: string;
}

async function check(res: Response, what: string): Promise<Response> {
  if (!res.ok) throw new Error(`Couldn't ${what} (${res.status}).`);
  return res;
}

export async function listFavourites(): Promise<string[]> {
  const res = await check(await authedFetch("/rest/v1/saved_monitors?select=monitor_id&order=created_at.desc"), "load your saved monitors");
  return ((await res.json()) as { monitor_id: string }[]).map((r) => r.monitor_id);
}

export async function addFavourite(userId: string, monitorId: string): Promise<void> {
  await check(
    await authedFetch("/rest/v1/saved_monitors", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, monitor_id: monitorId }),
    }),
    "save that monitor",
  );
}

export async function removeFavourite(monitorId: string): Promise<void> {
  await check(await authedFetch(`/rest/v1/saved_monitors?monitor_id=eq.${encodeURIComponent(monitorId)}`, { method: "DELETE" }), "remove that monitor");
}

export async function listSetups(): Promise<SavedSetup[]> {
  const res = await check(await authedFetch("/rest/v1/saved_setups?select=id,name,params,updated_at&order=updated_at.desc"), "load your setups");
  return res.json();
}

export async function saveSetup(userId: string, name: string, params: string): Promise<SavedSetup> {
  const res = await check(
    await authedFetch("/rest/v1/saved_setups?select=id,name,params,updated_at", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userId, name, params }),
    }),
    "save this setup",
  );
  return ((await res.json()) as SavedSetup[])[0];
}

export async function renameSetup(id: string, name: string): Promise<void> {
  await check(
    await authedFetch(`/rest/v1/saved_setups?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name }) }),
    "rename that setup",
  );
}

export async function deleteSetup(id: string): Promise<void> {
  await check(await authedFetch(`/rest/v1/saved_setups?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }), "delete that setup");
}

/** Deletes the account, its favourites and its setups, then signs out. */
export async function deleteAccount(): Promise<void> {
  await check(await authedFetch("/rest/v1/rpc/delete_my_account", { method: "POST", body: "{}" }), "delete your account");
  clearLocalSession();
}
