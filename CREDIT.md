# Credits & Data Sources

Attribution for all third-party data and assets used in this project.

## Municipality boundaries (Provincia di Cuneo)

- **Source:** [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy) — file `geojson/limits_IT_municipalities.geojson`
- **Upstream data:** [ISTAT](https://www.istat.it/it/archivio/222527) — Confini delle unità amministrative a fini statistici
- **License:** [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) (openpolis) / ISTAT open data
- **Used for:** the `comuni.json` boundary polygons extracted per province (see `scripts/extract-map.ts`). The raw national file is not committed; only the extracted per-province subset is.

## Population (energy-run mode sampling)

- **Source:** [ISTAT](https://www.istat.it/) resident population by comune (permanent
  population census, 2021), obtained from the tidy per-comune redistribution
  [opendatasicilia/comuni-italiani](https://github.com/opendatasicilia/comuni-italiani)
  (`dati/popolazione_2021.csv`, keyed on the ISTAT `pro_com_t` code; Sassofeltrio —
  which moved province in 2021 — sourced from the same repo's `ISTAT_popolazione_2021.csv`).
- **License:** ISTAT open data (CC BY 4.0).
- **Used for:** population-weighted sampling order in the energy-run game mode. Joined at
  extraction time from an `istat-popolazione.csv` (two columns: `istat,population`) placed at
  the repo root — not committed (same pattern as `italy-municipalities.geojson`, see
  `scripts/extract-map.ts`). Comuni missing from that file default to population 1.

## Libraries

- **qrcode-generator** — [kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) — [MIT License](https://opensource.org/licenses/MIT) — used to render the room-invite QR code client-side (as an inline SVG) in multiplayer lobbies.

## Fonts

- **Fraunces** — [Google Fonts](https://fonts.google.com/specimen/Fraunces) — [SIL Open Font License 1.1](https://openfontlicense.org/)
- **Inter** — [Google Fonts](https://fonts.google.com/specimen/Inter) — [SIL Open Font License 1.1](https://openfontlicense.org/)
