# Database

Two Supabase projects (eu-west-2, London):

| | Project | Ref |
|---|---|---|
| Live | Monitor Lab | `bkxgdaytwhguupajgodj` |
| Dev | Monitor Lab Dev | `jfaconbqvynuatstbvml` |

`migrations/` holds every schema change in order. Apply each new migration to **dev** first. Apply it to **live** only when the code that needs it is merged into `main`.

- `20261006170000_baseline.sql` – the live schema as of 6 Oct 2026. Already on live; used to create dev.
- `20261006180000_saved_setups.sql` – saved setups and "delete my account" (accounts v1).

The dev catalogue is a copy of live (same IDs, so share links work on both). Catalogue edits are made on live.
