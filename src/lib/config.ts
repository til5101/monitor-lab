declare const __SUPABASE_URL__: string;
declare const __SUPABASE_KEY__: string;

/** Injected at build time by scripts/build.mjs. */
export const supabaseConfig = {
  url: __SUPABASE_URL__,
  key: __SUPABASE_KEY__,
};
