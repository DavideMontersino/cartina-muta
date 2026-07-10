import type { MunicipalityFlavor } from "./types";

/**
 * Per-comune flavour, keyed by ISTAT municipality code (the stable id on every
 * `MapFeature`). This is the most specific override layer: `win`/`miss` fall
 * back to the province → region → generic phrase pools when absent, and
 * `facts`/`campanile` simply don't render when a comune has none.
 *
 * To add a comune, look up its ISTAT code in the province's map data
 * (`src/maps/data/<id>.json`) and drop an entry here. Campanile photos, when
 * added, must be credited in CREDIT.md (source + licence).
 */
export const municipalityFlavor: Record<string, MunicipalityFlavor> = {
  // Torino — the regional capital; missing it is a special kind of shame.
  "001272": {
    win: [
      "Torino presa al volo, sabauda precisione!",
      "Il capoluogo è tuo: dritto come corso Vittorio.",
    ],
    miss: [
      "Manco il capoluogo, che vergogna!",
      "Sbagli pure Torino? La Mole ti guarda male.",
    ],
    fail: ["Ti sei arreso sul capoluogo... la prima capitale d'Italia, eh."],
    facts: [
      "Prima capitale del Regno d'Italia (1861–1865).",
      "La Mole Antonelliana, alta 167 m, è il simbolo della città.",
      "Qui nel 1899 nacque la FIAT.",
    ],
  },
  // Carrù (CN) — the fair of the fat ox (bue grasso) is its claim to fame.
  "004043": {
    win: ["Carrù beccata: bel bue grasso!"],
    miss: [
      "Niente bue grasso per te!",
      "Carrù ti sfugge? E la fiera del bue grasso allora?",
    ],
    fail: ["Ti sei perso Carrù: niente bollito, niente bue grasso."],
    facts: [
      "Celebre per la Fiera del Bue Grasso, ogni dicembre dal 1910.",
      "Patria del bollito misto piemontese.",
    ],
  },
};
