# Credits & Data Sources

Attribution for all third-party data and assets used in this project.

## Municipality boundaries (Provincia di Cuneo)

- **Source:** [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy) — file `geojson/limits_IT_municipalities.geojson`
- **Upstream data:** [ISTAT](https://www.istat.it/it/archivio/222527) — Confini delle unità amministrative a fini statistici
- **License:** [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) (openpolis) / ISTAT open data
- **Used for:** the `comuni.json` boundary polygons extracted per province (see `scripts/extract-map.ts`). The raw national file is not committed; only the extracted per-province subset is.

## Population (energy-run mode sampling)

- **Source:** [ISTAT](https://www.istat.it/) resident population by comune (the same open-data
  portal as the municipality boundaries above — see [Popolazione e famiglie](https://www.istat.it/it/popolazione-e-famiglie),
  latest available year).
- **License:** ISTAT open data.
- **Used for:** population-weighted sampling order in the energy-run game mode. Joined at
  extraction time from an `istat-popolazione.csv` (two columns: `istat,population`) placed at
  the repo root — not committed (same pattern as `italy-municipalities.geojson`, see
  `scripts/extract-map.ts`). Comuni missing from that file default to population 1.

## Fonts

- **Fraunces** — [Google Fonts](https://fonts.google.com/specimen/Fraunces) — [SIL Open Font License 1.1](https://openfontlicense.org/)
- **Inter** — [Google Fonts](https://fonts.google.com/specimen/Inter) — [SIL Open Font License 1.1](https://openfontlicense.org/)
