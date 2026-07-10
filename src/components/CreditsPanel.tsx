// Mirrors CREDIT.md — keep the two in sync when attributions change.
export function CreditsPanel() {
  return (
    <div className="credits">
      <h2 className="credits__title">Crediti e fonti dati</h2>
      <section className="credits__section">
        <h3>Confini comunali</h3>
        <p>
          Dati{" "}
          <a
            href="https://github.com/openpolis/geojson-italy"
            target="_blank"
            rel="noreferrer"
          >
            openpolis/geojson-italy
          </a>
          , derivati da{" "}
          <a
            href="https://www.istat.it/it/archivio/222527"
            target="_blank"
            rel="noreferrer"
          >
            ISTAT
          </a>{" "}
          — confini delle unità amministrative a fini statistici. Licenza ODbL
          1.0 (openpolis) / ISTAT open data.
        </p>
      </section>
      <section className="credits__section">
        <h3>Popolazione (modalità energia)</h3>
        <p>
          Popolazione residente ISTAT (censimento 2021), redistribuita per
          comune da{" "}
          <a
            href="https://github.com/opendatasicilia/comuni-italiani"
            target="_blank"
            rel="noreferrer"
          >
            opendatasicilia/comuni-italiani
          </a>
          . Licenza ISTAT open data (CC BY 4.0).
        </p>
      </section>
      <section className="credits__section">
        <h3>Rilievo, acque e contesto</h3>
        <p>
          Rilievo (fasce ipsometriche) da{" "}
          <a
            href="https://registry.opendata.aws/terrain-tiles/"
            target="_blank"
            rel="noreferrer"
          >
            AWS Terrain Tiles
          </a>{" "}
          (Mapzen/Terrarium). Fiumi e laghi ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          (ODbL). Province, stati e mari confinanti da{" "}
          <a
            href="https://www.naturalearthdata.com/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth
          </a>{" "}
          (dominio pubblico).
        </p>
      </section>
      <section className="credits__section">
        <h3>Font</h3>
        <p>
          Fraunces, Inter e Pinyon Script, da{" "}
          <a href="https://fonts.google.com" target="_blank" rel="noreferrer">
            Google Fonts
          </a>{" "}
          — SIL Open Font License 1.1.
        </p>
      </section>
    </div>
  );
}
