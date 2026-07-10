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

The optional "Rilievo" toggle (available in every game mode) draws self-baked,
theme-tinted **vector** relief (hypsometric contour bands), rivers/lakes, and
neighbour/country/sea context around the comuni. Unlike a third-party basemap,
everything is baked from open data by rerunnable scripts and committed per
province, so the look is fully restylable (relief colours are pure CSS) and no
place names spoil the blind-map guess. Three sources:

### Elevation (relief bands)

- **Source:** [AWS Terrain Tiles / Mapzen "Terrarium" terrain-RGB](https://registry.opendata.aws/terrain-tiles/)
  (`s3.amazonaws.com/elevation-tiles-prod/terrarium`).
- **Upstream data:** a global DEM composited from public sources (SRTM, GMTED,
  ETOPO1, the National Elevation Dataset, and others — see the AWS Terrain Tiles
  attribution).
- **License:** the underlying data is in the public domain / under the licenses of
  the respective source agencies; the tileset is provided by Mapzen/Nextzen and
  hosted openly by AWS.
- **Used for:** `scripts/extract-relief.ts` fetches the covering DEM tiles, builds an
  elevation grid, and runs `d3-contour` to bake vector hypsometric bands (GeoJSON) per
  province to `src/maps/relief/`. Colours are applied in CSS.

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

- **Source:** [Wikimedia Commons](https://commons.wikimedia.org/), downloaded as
  local assets under `public/campanili/<istat>.jpg` (no hot-linking). The
  per-comune override layer (`src/phrases/municipalities.ts`) has an optional
  `campanile` field (an array of asset paths) that, when populated, shows a
  photo of the comune's bell tower / signature landmark on the win/give-up popup
  (one is picked at random per reveal).
- **Requirement:** any photo added here **must** be credited below (source,
  author, licence). Only public-domain / CC0 / CC-BY / CC-BY-SA images are used.
- **Used for:** the `.reaction-toast__campanile` image in `GameScreen.tsx`.

### Provincia di Cuneo — Tier 1 (top 25 comuni)

- **Cuneo campanile** (`/campanili/004078.jpg`) — [File:Cuneo Torre.jpeg](https://commons.wikimedia.org/wiki/File:Cuneo_Torre.jpeg) by Hansm, CC BY-SA 3.0.
- **Alba campanile** (`/campanili/004003.jpg`) — [File:Alba-duomo-campanile.jpg](https://commons.wikimedia.org/wiki/File:Alba-duomo-campanile.jpg) by Davide Papalini, CC BY-SA 3.0.
- **Bra campanile** (`/campanili/004029.jpg`) — [File:Bra Chiesa di Santa Chiara Esterno Campanile.jpg](https://commons.wikimedia.org/wiki/File:Bra_Chiesa_di_Santa_Chiara_Esterno_Campanile.jpg) by Zairon, CC BY-SA 4.0.
- **Fossano campanile** (`/campanili/004089.jpg`) — [File:Fossano Cattedrale di Santa Maria e San Giovenale Esterno Campanile.jpg](https://commons.wikimedia.org/wiki/File:Fossano_Cattedrale_di_Santa_Maria_e_San_Giovenale_Esterno_Campanile.jpg) by Zairon, CC BY-SA 4.0.
- **Mondovì campanile** (`/campanili/004130.jpg`) — [File:Mondovì-TorreCivica.jpg](https://commons.wikimedia.org/wiki/File:Mondov%C3%AC-TorreCivica.jpg) by Marco Plassio, CC BY-SA 3.0.
- **Savigliano campanile** (`/campanili/004215.jpg`) — [File:Savigliano-torre civica.jpg](https://commons.wikimedia.org/wiki/File:Savigliano-torre_civica.jpg) by Davide Papalini, CC BY-SA 3.0.
- **Saluzzo campanile** (`/campanili/004203.jpg`) — [File:Saluzzo Torre Civica Esterno 1.jpg](https://commons.wikimedia.org/wiki/File:Saluzzo_Torre_Civica_Esterno_1.jpg) by Zairon, CC BY-SA 4.0.
- **Borgo San Dalmazzo campanile** (`/campanili/004025.jpg`) — [File:Borgosandalmazzo chiesa san dalmazzo.jpg](https://commons.wikimedia.org/wiki/File:Borgosandalmazzo_chiesa_san_dalmazzo.jpg) by Luigi.tuby, CC BY-SA 3.0.
- **Busca campanile** (`/campanili/004034.jpg`) — [File:Busca via bofferio.jpg](https://commons.wikimedia.org/wiki/File:Busca_via_bofferio.jpg) by Luigi.tuby, CC BY-SA 3.0.
- **Racconigi – Castello Reale** (`/campanili/004179.jpg`) — [File:Racconigi Castello Reale di Racconigi Esterno 1.jpg](https://commons.wikimedia.org/wiki/File:Racconigi_Castello_Reale_di_Racconigi_Esterno_1.jpg) by Zairon, CC BY-SA 4.0.
- **Boves – Chiesa di San Bartolomeo Apostolo** (`/campanili/004028.jpg`) — [File:Chiesa di San Bartolomeo Apostolo, Boves, vista frontale.jpg](https://commons.wikimedia.org/wiki/File:Chiesa_di_San_Bartolomeo_Apostolo,_Boves,_vista_frontale.jpg) by Francians, CC BY-SA 4.0.
- **Cherasco – campanile di San Gregorio** (`/campanili/004067.jpg`) — [File:Cherasco-chiesa san gregorio-campanile.jpg](https://commons.wikimedia.org/wiki/File:Cherasco-chiesa_san_gregorio-campanile.jpg) by Davide Papalini, CC BY-SA 3.0.
- **Barge – San Giovanni Battista** (`/campanili/004012.jpg`) — [File:San Giovanni Battista, chiesa parrocchiale di Barge, Italia.jpg](https://commons.wikimedia.org/wiki/File:San_Giovanni_Battista,_chiesa_parrocchiale_di_Barge,_Italia.jpg) by F Ceragioli, CC BY-SA 3.0.
- **Dronero – Ponte del Diavolo** (`/campanili/004082.jpg`) — [File:Dronero-Ponte del Diavolo-20180808 110932.jpg](https://commons.wikimedia.org/wiki/File:Dronero-Ponte_del_Diavolo-20180808_110932.jpg) by Ale zena, CC BY-SA 4.0.
- **Centallo – San Giovanni Battista** (`/campanili/004061.jpg`) — [File:Centallo chiesa san giovanni battista.jpg](https://commons.wikimedia.org/wiki/File:Centallo_chiesa_san_giovanni_battista.jpg) by Luigi.tuby, CC BY-SA 3.0.
- **Caraglio – Filatoio Rosso** (`/campanili/004040.jpg`) — [File:FilatoioCaraglio01.jpg](https://commons.wikimedia.org/wiki/File:FilatoioCaraglio01.jpg) by Enryonthecloud, Public domain.
- **Verzuolo – Santi Filippo e Giacomo** (`/campanili/004240.jpg`) — [File:Verzuolo-IMG 1184.JPG](https://commons.wikimedia.org/wiki/File:Verzuolo-IMG_1184.JPG) by Davide Papalini, CC BY 2.5.
- **Sommariva del Bosco – Porta del Roero** (`/campanili/004222.jpg`) — [File:Panorama di Sommariva del Bosco, Porta del Roero.jpg](https://commons.wikimedia.org/wiki/File:Panorama_di_Sommariva_del_Bosco,_Porta_del_Roero.jpg) by Tucidide85, Public Domain.
- **Bagnolo Piemonte – piazza San Pietro** (`/campanili/004009.jpg`) — [File:Bagnolo Piemonte (CN) - piazza San Pietro.jpg](https://commons.wikimedia.org/wiki/File:Bagnolo_Piemonte_(CN)_-_piazza_San_Pietro.jpg) by Lucifer2602, CC BY-SA 4.0.
- **Villanova Mondovì – Santuario di Santa Lucia** (`/campanili/004245.jpg`) — [File:Santuario di Santa Lucia presso Villanova Mondovì.jpg](https://commons.wikimedia.org/wiki/File:Santuario_di_Santa_Lucia_presso_Villanova_Mondov%C3%AC.jpg) by Valerio Manassero, CC BY-SA 3.0.
- **Ceva – Duomo con campanile** (`/campanili/004066.jpg`) — [File:Ceva-Duomo con campanile.jpg](https://commons.wikimedia.org/wiki/File:Ceva-Duomo_con_campanile.jpg) by Marco Plassio, CC BY-SA 3.0.
- **Canale – panorama** (`/campanili/004037.jpg`) — [File:Canale, panorama - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Canale,_panorama_-_panoramio.jpg) by Virginia Scarsi, CC BY-SA 3.0.
- **Peveragno – Ricetto** (`/campanili/004163.jpg`) — [File:Ricetto di Peveragno.jpg](https://commons.wikimedia.org/wiki/File:Ricetto_di_Peveragno.jpg) by Fabio Carassio, CC0.
- **Cavallermaggiore – Santa Maria della Pieve** (`/campanili/004059.jpg`) — [File:Cavallermaggiore-chiesa santa maria della pieve-campanile.jpg](https://commons.wikimedia.org/wiki/File:Cavallermaggiore-chiesa_santa_maria_della_pieve-campanile.jpg) by Davide Papalini, CC BY-SA 3.0.
- **Cervasca – San Michele** (`/campanili/004064.jpg`) — [File:Cervasca sanmicheledicervasca pianuracuneese.jpg](https://commons.wikimedia.org/wiki/File:Cervasca_sanmicheledicervasca_pianuracuneese.jpg) by Luigi.tuby, CC BY-SA 3.0.

### Provincia di Cuneo — Tier 2 (rows ~26-85 by population)

- **Guarene – Castello di Guarene** (`/campanili/004101.jpg`) — [File:Castello di Guarene 2017-09 n01.jpg](https://commons.wikimedia.org/wiki/File:Castello%20di%20Guarene%202017-09%20n01.jpg) by Jastrow, CC BY 4.0.
- **Montà – panorama** (`/campanili/004133.jpg`) — [File:Panorama di Montà.JPG](https://commons.wikimedia.org/wiki/File:Panorama%20di%20Mont%C3%A0.JPG) by Stefano182, CC BY-SA 3.0.
- **Santo Stefano Belbo – veduta** (`/campanili/004213.jpg`) — [File:Santo Stefano Belbo (CN).jpg](https://commons.wikimedia.org/wiki/File:Santo%20Stefano%20Belbo%20%28CN%29.jpg) by Frukko, CC BY-SA 4.0.
- **Manta – Castello della Manta** (`/campanili/004116.jpg`) — [File:Castello della Manta.jpg](https://commons.wikimedia.org/wiki/File:Castello%20della%20Manta.jpg) by Maurizio Moro5153, CC BY-SA 4.0.
- **Bene Vagienna – veduta** (`/campanili/004019.jpg`) — [File:Bene Vagienna da Santo Stefano.jpg](https://commons.wikimedia.org/wiki/File:Bene%20Vagienna%20da%20Santo%20Stefano.jpg) by Abisys, CC BY-SA 3.0.
- **Dogliani – veduta del borgo** (`/campanili/004081.jpg`) — [File:Dogliani veduta.jpg](https://commons.wikimedia.org/wiki/File:Dogliani%20veduta.jpg) by Luigi.tuby, CC BY-SA 3.0.
- **Revello – Collegiata** (`/campanili/004180.jpg`) — [File:Collegiata di Revello.jpg](https://commons.wikimedia.org/wiki/File:Collegiata%20di%20Revello.jpg) by Pmk58, CC BY-SA 4.0.
- **Moretta – chiesa di San Giovanni Battista** (`/campanili/004143.jpg`) — [File:Moretta - chiesa di San Giovanni Battista - facciata.jpg](https://commons.wikimedia.org/wiki/File:Moretta%20-%20chiesa%20di%20San%20Giovanni%20Battista%20-%20facciata.jpg) by Betty&Giò, CC BY-SA 4.0.
- **Diano d'Alba – chiesa di San Giovanni** (`/campanili/004080.jpg`) — [File:Diano d'Alba Chiesa S.Giovanni.jpg](https://commons.wikimedia.org/wiki/File:Diano%20d%27Alba%20Chiesa%20S.Giovanni.jpg) by Pmk58, CC BY-SA 4.0.
- **Scarnafigi – Piazza V.E.** (`/campanili/004217.jpg`) — [File:Scarnafigi Piazza V.E.jpg](https://commons.wikimedia.org/wiki/File:Scarnafigi_Piazza_V.E.jpg) by Mario Blais, CC BY-SA 4.0.
- **Priocca** (`/campanili/004176.jpg`) — [File:Priocca.jpg](https://commons.wikimedia.org/wiki/File:Priocca.jpg) by User:Dzag, CC BY-SA 3.0.
- **Morozzo – chiesa della Natività di Maria** (`/campanili/004144.jpg`) — [File:Morozzo chiesa della Nativita di Maria.jpg](https://commons.wikimedia.org/wiki/File:Morozzo_chiesa_della_Nativita_di_Maria.jpg) by Luigi.tuby, CC BY-SA 4.0.
- **Grinzane Cavour – castello** (`/campanili/004100.jpg`) — [File:Castello di Grinzane Cavour, dalla Strada (cropped).jpg](https://commons.wikimedia.org/wiki/File:Castello_di_Grinzane_Cavour,_dalla_Strada_(cropped).jpg) by BlackLukes, CC BY-SA 3.0.
- **Monforte d'Alba – panorama** (`/campanili/004132.jpg`) — [File:Monforte panorama.jpg](https://commons.wikimedia.org/wiki/File:Monforte_panorama.jpg) by Luigi.tuby, CC BY-SA 3.0.
- **Demonte** (`/campanili/004079.jpg`) — [File:I-CN-Demonte1.JPG](https://commons.wikimedia.org/wiki/File:I-CN-Demonte1.JPG) by Szeder László, CC BY-SA 4.0.
- **Frabosa Sottana** (`/campanili/004091.jpg`) — [File:Frabosa Sottana - Comune di Frabosa Sottana - 2023-09-01 10-44-54 001.jpg](https://commons.wikimedia.org/wiki/File:Frabosa_Sottana_-_Comune_di_Frabosa_Sottana_-_2023-09-01_10-44-54_001.jpg) by Bubici, CC BY-SA 4.0.
- **Monteu Roero** (`/campanili/004140.jpg`) — [File:Monteu Roero 01.jpg](https://commons.wikimedia.org/wiki/File:Monteu_Roero_01.jpg) by mattis (User:Mattana), CC BY-SA 4.0.
- **Roddi – veduta** (`/campanili/004194.jpg`) — [File:Roddi veduta.JPG](https://commons.wikimedia.org/wiki/File:Roddi_veduta.JPG) by Georgius LXXXIX, CC BY-SA 3.0.

## Libraries

- **qrcode-generator** — [kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) — [MIT License](https://opensource.org/licenses/MIT) — used to render the room-invite QR code client-side (as an inline SVG) in multiplayer lobbies.

## Fonts

- **Fraunces** — [Google Fonts](https://fonts.google.com/specimen/Fraunces) — [SIL Open Font License 1.1](https://openfontlicense.org/)
- **Inter** — [Google Fonts](https://fonts.google.com/specimen/Inter) — [SIL Open Font License 1.1](https://openfontlicense.org/)
