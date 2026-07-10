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

## Terrain layer (optional tinted hillshade + waterways + context)

The optional "Rilievo" toggle (available in every game mode) draws a self-baked,
theme-tinted shaded relief, rivers/lakes, and neighbour/country/sea context
behind the comuni. Unlike a third-party basemap, everything is baked from open
data by rerunnable scripts and committed per province, so the look is fully
restylable and no place names spoil the blind-map guess. Three sources:

### Elevation (hillshade)

- **Source:** [AWS Terrain Tiles / Mapzen "Terrarium" terrain-RGB](https://registry.opendata.aws/terrain-tiles/)
  (`s3.amazonaws.com/elevation-tiles-prod/terrarium`).
- **Upstream data:** a global DEM composited from public sources (SRTM, GMTED,
  ETOPO1, the National Elevation Dataset, and others — see the AWS Terrain Tiles
  attribution).
- **License:** the underlying data is in the public domain / under the licenses of
  the respective source agencies; the tileset is provided by Mapzen/Nextzen and
  hosted openly by AWS.
- **Used for:** `scripts/extract-relief.ts` fetches the covering DEM tiles, computes a
  hillshade, tints it to the parchment palette, and writes one PNG + WGS84 bounds per
  province to `src/maps/relief/`.

### Waterways

- **Source:** [OpenStreetMap](https://www.openstreetmap.org/) via the
  [Overpass API](https://overpass-api.de/).
- **License:** [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — © OpenStreetMap contributors.
- **Used for:** `scripts/extract-water.ts` queries rivers/canals/lakes/reservoirs per
  province bbox and writes `src/maps/water/<id>.json`.

### Neighbour / country / sea context

- **Source:** [Natural Earth](https://www.naturalearthdata.com/) — `ne_10m_admin_0_countries`
  (adjacent countries) and `ne_10m_geography_marine_polys` (sea names), via
  [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector).
  Neighbouring provinces reuse the in-repo `src/maps/overview.json`.
- **License:** Natural Earth is in the **public domain**.
- **Used for:** `scripts/extract-context.ts` writes neighbour/country outlines and
  outside-only labels (never inside the target province) to `src/maps/context/<id>.json`.

On-map attribution ("Rilievo: Terrain Tiles · Acque © OpenStreetMap · Confini:
Natural Earth") is shown whenever the layer is active.

## Campanile photos (municipality flavour popups)

- **Source:** none committed yet. The per-comune override layer
  (`src/phrases/municipalities.ts`) has an optional `campanile` field that, when
  populated, shows a photo of the comune's bell tower on the win/give-up popup.
- **Requirement:** any photo added here **must** be credited in this section
  (source, author, licence). Prefer public-domain or CC-licensed images (e.g.
  Wikimedia Commons) and import them as local assets rather than hot-linking, so
  attribution and availability stay under our control.
- **Used for:** the `.reaction-toast__campanile` image in `GameScreen.tsx`.

## Libraries

- **qrcode-generator** — [kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) — [MIT License](https://opensource.org/licenses/MIT) — used to render the room-invite QR code client-side (as an inline SVG) in multiplayer lobbies.

## Fonts

- **Fraunces** — [Google Fonts](https://fonts.google.com/specimen/Fraunces) — [SIL Open Font License 1.1](https://openfontlicense.org/)
- **Inter** — [Google Fonts](https://fonts.google.com/specimen/Inter) — [SIL Open Font License 1.1](https://openfontlicense.org/)
