# Monitor Lab

See your next monitor before you buy it: real-scale comparison of size, sharpness, usable workspace, ports and desk fit. Lives at [monitorlab.co.uk](https://monitorlab.co.uk).

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

The monitor catalogue is read from Supabase (`monitor_models`). The publishable key in `scripts/build.mjs` can only read active rows; override it with `SUPABASE_URL` / `SUPABASE_KEY` if needed.

## Layout

- `src/lib/` – the maths and data, no UI. `setup.ts` (screens, workspace, desk fit), `insights.ts`, `features.ts`, `catalogue.ts`, `deskScene.ts`.
- `src/components/` – the interface.
- `src/styles/app.css` – all styling. Three layout bands: phone (< 900px), laptop (900–1999px) and wide (≥ 2000px).

Figures match the original Squarespace version (v11) for the same inputs.
