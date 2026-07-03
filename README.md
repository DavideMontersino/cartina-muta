# Cartina Muta

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

## Adding a new map

1. Add the province to `PROVINCES` in `scripts/extract-map.ts`.
2. Download the national boundary file (see [CREDIT.md](./CREDIT.md)) to the repo
   root as `italy-municipalities.geojson`, then run `npm run extract-map`.
3. Create `src/maps/<id>/index.ts` exporting a `MapDefinition` (copy `cuneo`).
4. Register it in `src/maps/registry.ts`.

The home screen shows a map picker automatically once more than one map exists.

## Data & attribution

See [CREDIT.md](./CREDIT.md). Boundaries are ISTAT data via openpolis (ODbL).
