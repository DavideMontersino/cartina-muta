# Campanilismi

A blind-map geography game. You're shown the borders of every municipality in an
area — the game names one, you click it. Built to be easy to extend to new maps.

Starting map: **Provincia di Cuneo** (247 comuni).

## Game modes

- **A tempo** — find as many comuni as you can before the clock runs out (1 / 5 / 10 min).
- **Completa tutti** — find every comune, no time limit; precision counts.

## Stack

Vite + React 19 + TypeScript, static SPA. Deployed to **Cloudflare Pages**
(same setup as the sibling `amblyopia-studio` project).

```bash
npm install
npm run dev        # local dev server
npm run test       # engine unit tests
npm run build      # production build to dist/
npm run deploy     # wrangler pages deploy dist/ --project-name=cartina-muta
```

## Regenerating the maps

All 107 Italian provinces are extracted automatically — there is no per-province
registration step.

1. Download the national boundary file (see [CREDIT.md](./CREDIT.md)) to the repo
   root as `italy-municipalities.geojson`.
2. Optionally, download ISTAT's resident population by comune (see
   [CREDIT.md](./CREDIT.md)) to the repo root as `istat-popolazione.csv` (two columns:
   `istat,population`). Without it, every comune defaults to population 1 and the
   energy-run mode's weighted sampling degrades to uniform.
3. Run `npm run extract-map`. This regenerates, from the ISTAT source:
   - `src/maps/data/<id>.json` — one lazy-loaded file per province (`id` = lowercased
     2-letter province acronym, e.g. Cuneo → `cn`), each comune carrying its population
     and geographic centroid alongside its border;
   - `src/maps/provinces.json` — the always-loaded province index;
   - `src/maps/overview.json` — province boundaries (municipalities dissolved per
     province) for the national picker map.

The home screen offers an autocomplete search, the clickable national map, and a
"random province" button.

## Data & attribution

See [CREDIT.md](./CREDIT.md). Boundaries are ISTAT data via openpolis (ODbL).
