/**
 * Phrase pools for map context labels (neighbouring provinces, regions, countries).
 * Shown in place of the real neighbour name on the map canvas.
 *
 * Two layers, both applied additively:
 *   1. nationalLabelPools  — Italian stereotypes visible from any province
 *   2. provinceLabelPools  — local perspective for specific provinces
 *
 * Keys are uppercase canonical identifiers; LABEL_NAME_TO_KEY maps the Italian
 * label names that appear in the baked context JSON to these keys.
 *
 * Source: assets/italia.json, assets/cuneo.json, assets/torino.json, assets/genova.json
 */

export const nationalLabelPools: Record<string, string[]> = {
  FRANCE: [
    "Hic non sunt bidet",
    "Mangiatori di baguette",
    "Ladri della Gioconda",
    "Cugini arroganti",
    "Puzza di formaggio",
    "Scioperanti professionisti",
    "Posh senza motivo",
    "Puzza sotto il naso",
  ],
  SWITZERLAND: [
    "Paradiso fiscale",
    "Autovelox umani",
    "Evasori precisi",
    "Cioccolato e segretezza",
    "Orologiai noiosi",
    "Caveau d'oro",
    "Zero senso dell'umorismo",
    "Frontalieri sfruttati",
  ],
  AUSTRIA: [
    "Tedeschi di montagna",
    "Tiranni della Vignette",
    "Brennero bloccato",
    "Baffi asburgici",
    "Canederli e rigore",
    "Barriera anti-italiani",
  ],
  SLOVENIA: [
    "Benzina e sigarette economiche",
    "Casinò low-cost",
    "Terra degli orsi",
    "Dentisti a basso costo",
    "Autogrill gigante",
    "Confine dell'Est",
  ],
  SAN_MARINO: [
    "Outlet senza IVA",
    "Trappola per turisti su roccia",
    "Stato-condominio",
    "Balestre e souvenir",
  ],
  VATICAN_CITY: [
    "Esentasse per grazia ricevuta",
    "Cortile privato del Papa",
    "Guardie Svizzere in pigiama",
    "Segreti di Stato",
  ],
  PIEDMONT: [
    "Nebbia e risaie",
    "Fiato alla Bagna Caùda",
    "Monotonia sabauda",
    "Palude padana",
  ],
  TORINO: [
    "Fiat-landia",
    "Bugianen",
    "Depressione industriale",
    "Ex capitale sabauda",
    "Smog e tram vecchi",
    "Fabbriche abbandonate",
    "Juventus e disperazione",
    "Murazzi nostalgici",
  ],
  CUNEO: [
    "Provincia dei 7 matti",
    "Zucconi isolazionisti",
    "Montanari spilorci",
    "Terra di nessuno",
    "Nocciole e letame",
    "Confine selvaggio",
  ],
  ASTI: [
    "Spumante economico",
    "Dosso stradale per Torino",
    "Finto champagne festivo",
    "Vuoto cosmico piemontese",
  ],
  ALESSANDRIA: [
    "Capitale dell'umidità",
    "Regno delle zanzare",
    "Nebbia perenne",
    "Svincolo autostradale desolato",
  ],
  LIGURIA: [
    "Barattolo di pesto sigillato",
    "Cemento verticale",
    "Braccine corte",
    "Scogli e mugugni",
    "Niente turisti per favore",
    "Chiuso per lutto economico",
  ],
  GENOVA: [
    "Parcheggi a pagamento",
    "Mugugno perenne",
    "Salite impossibili",
    "Lanterna e cinghiali",
  ],
  SAVONA: [
    "Ombrelloni sovrapprezzati",
    "Ospizio a cielo aperto",
    "Spiagge per milanesi",
    "Focaccia unta e cara",
  ],
  IMPERIA: [
    "Olio d'oliva",
    "Code autostradali",
    "Fiori appassiti",
    "Succursale di Sanremo",
  ],
};

/** Province-specific perspectives, keyed by 2-letter province id then label key. */
export const provinceLabelPools: Record<string, Record<string, string[]>> = {
  cn: {
    FRANCE: [
      "Supermercati economici d'oltreconfine",
      "Sciatori scarsi",
      "Ladri di frontalieri",
      "Confine dimenticato",
    ],
    TORINO: [
      "Fighetti metropolitani",
      "Ladri di tasse cuneesi",
      "Università obbligatoria",
      "Snob da aperitivo",
      "Traffico e aria finta",
      "Sanguisughe regionali",
    ],
    ASTI: [
      "Finti esperti di vino",
      "Rivali del Palio",
      "Spumante annacquato",
      "Meno terra, più pretese",
    ],
    SAVONA: [
      "Mare inquinato dell'infanzia",
      "Focaccia a prezzo raddoppiato (targa CN)",
      "Colonizzatori estivi",
      "La nostra spiaggia privata",
    ],
    IMPERIA: [
      "Fornitore ufficiale di olio",
      "Sanremo da ricchi",
      "Stradine impervie",
      "Sbocco sul mare",
    ],
  },
  to: {
    FRANCE: [
      "Scippatori della Savoia",
      "Pista da sci di riserva",
      "Cugini da sfottere",
      "Tunnel costosi",
    ],
    CUNEO: [
      "Contadini a testa quadra",
      "Anno Domini 1950",
      "Ottima carne, poca conversazione",
      "Provinciali isolati",
      "Zappe e trattori",
      "Territorio inesplorato",
    ],
    ASTI: [
      "Vigna gigante anti-mare",
      "Scorta di Barbera",
      "Periferia allargata",
      "Paesotto vinicolo",
    ],
    ALESSANDRIA: [
      "Palude di passaggio",
      "Il nulla prima della Liguria",
      "Zanzare stradali",
      "Nebbia da scansare",
    ],
    VALLE_D_AOSTA: [
      "Seconda casa in montagna",
      "Falsi francesi esentasse",
      "Piste da sci personali",
      "Montanari con lo statuto speciale",
    ],
  },
  ge: {
    SAVONA: [
      "Porto sfigato",
      "Sabbia per turisti pigri",
      "Rivali di ponente",
      "Succursale per pensionati",
    ],
    LA_SPEZIA: [
      "Praticamente Toscana",
      "Monopolio delle Cinque Terre",
      "Dialetto imbastardito",
      "I finti liguri",
    ],
    CUNEO: [
      "Subalpini della domenica",
      "Clienti lamentosi ma paganti",
      "Mangia-polenta in spiaggia",
      "Invasori con il frigo portatile",
    ],
    TORINO: [
      "Foresti della Fiat",
      "Invasori della A10",
      "Fumo di Torino sulle nostre spiagge",
      "Focaccia calda alle 3 del pomeriggio",
    ],
    ALESSANDRIA: [
      "Vento freddo invernale",
      "Turisti low-cost",
      "La nebbia che scende",
      "Camperisti lenti",
    ],
  },
};

/**
 * Mapping from Italian label names (as they appear in context JSON files) to
 * the uppercase canonical keys used above. Labels not listed here have no pool
 * and display their real name.
 */
export const LABEL_NAME_TO_KEY: Record<string, string> = {
  Francia: "FRANCE",
  Svizzera: "SWITZERLAND",
  Austria: "AUSTRIA",
  Slovenia: "SLOVENIA",
  "San Marino": "SAN_MARINO",
  "Città del Vaticano": "VATICAN_CITY",
  Piemonte: "PIEDMONT",
  Torino: "TORINO",
  Cuneo: "CUNEO",
  Asti: "ASTI",
  Alessandria: "ALESSANDRIA",
  Liguria: "LIGURIA",
  Genova: "GENOVA",
  Savona: "SAVONA",
  Imperia: "IMPERIA",
  "La Spezia": "LA_SPEZIA",
  "Valle d'Aosta": "VALLE_D_AOSTA",
};
