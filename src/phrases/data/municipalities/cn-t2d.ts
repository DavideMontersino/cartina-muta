import type { MunicipalityFlavor } from "../../types";

/**
 * Tier 2d — mid-size Cuneo comuni (~1.6k–2.1k ab.): Roero, Langhe del Barolo,
 * Monregalese e Valle Stura. Dialect words attested via cn.ts (brau, vitun,
 * balengu, sviciu, madoi, "òmmi òmmi", "oh basta là", blagor, gadan, badòla,
 * tüpin); light Occitan only where culturally accurate (Valle Stura). Facts are
 * verified against ≥2 independent web sources; sources noted per comune.
 * Campanile/landmark photos licensed from Wikimedia Commons (see CREDIT.md).
 */
export const cnTier2d: Record<string, MunicipalityFlavor> = {
  // Scarnafigi (004217) — soprannome "ciapamusche" (acchiappamosche); Castello
  // De Ponte (forma attuale dal 1641). Sources: Wikipedia IT (Scarnafigi);
  // comune.scarnafigi.cn.it; targatocn.it ("I Ciapamusche di Scarnafigi").
  "004217": {
    win: [
      "Scarnafigi centrata, brau: qui i ciapamusche ti fanno l'occhiolino!",
      "Presa la patria dei ciapamusche: 'a Scarnafis ciapu l musche n'si barbis', ma tu hai beccato il comune al volo!",
    ],
    miss: [
      "Manco Scarnafigi? Òmmi òmmi, i ciapamusche acchiappano le mosche ma tu non acchiappi il paese, vitun.",
      "Sbagli Scarnafigi? Da queste parti si prendono le mosche coi baffi, mica i comuni a caso, balengu.",
      "Vitun, hai perso il paese dei ciapamusche: se non tieni gli occhi aperti ti scappa pure la mosca.",
    ],
    fail: [
      "Ti arrendi su Scarnafigi? I ciapamusche ti guardano con affetto, ma il Castello De Ponte era proprio lì.",
    ],
    facts: [
      "Gli abitanti sono soprannominati 'ciapamusche' (acchiappamosche), da cui il detto 'a Scarnafis ciapu l musche n'si barbis'.",
      "Il Castello De Ponte, di origine anteriore all'anno Mille, deve la forma attuale al marchese Alessandro De Ponte, che lo rifece intorno al 1641.",
    ],
    campanile: ["/campanili/004217.jpg"],
  },
  // Roccaforte Mondovì (004190) — Monregalese, Valle Ellero, Pieve di San
  // Maurizio con affreschi. Sources: Wikipedia IT (Roccaforte Mondovì);
  // comune.roccafortemondovi.cn.it; visitmondovi.it.
  "004190": {
    win: [
      "Roccaforte Mondovì presa, brau: su per la Valle Ellero senza sbagliare!",
      "Centrato il paese sotto le rocche del Monregalese: sviciu che non sei altro!",
    ],
    miss: [
      "Manchi Roccaforte? La Valle Ellero è lassù e tu resti in pianura, balengu.",
      "Sbagli Roccaforte Mondovì? La Pieve di San Maurizio ti guarda dai suoi affreschi, vitun.",
    ],
    fail: [
      "Ti arrendi su Roccaforte Mondovì? Peccato, la Pieve di San Maurizio valeva la salita.",
    ],
    facts: [
      "Il territorio sale dai 575 metri del capoluogo fino a oltre 2600 metri tra Valle Ellero e Valle di Lurisia.",
      "La Pieve di San Maurizio conserva antichi affreschi ed è uno dei monumenti romanici più notevoli del Monregalese.",
    ],
  },
  // Pianfei (004165) — Monregalese; presepe meccanico dal 1997; nome da
  // "pian-fòi" (piano dei faggi); pittore Giuseppe Sacheri. Sources: Wikipedia
  // IT (Pianfei); comune.pianfei.cn.it; visitmondovi.it.
  "004165": {
    win: [
      "Pianfei centrata, brau: dritto nel piano dei faggi!",
      "Presa Pianfei: preciso come il suo presepe meccanico, che va da anni senza sbagliare un colpo!",
    ],
    miss: [
      "Manco Pianfei? Òmmi òmmi, ti sei perso nel piano dei faggi, balengu.",
      "Sbagli Pianfei? Il presepe meccanico si muove da solo, tu invece clicchi a vuoto, vitun.",
    ],
    fail: [
      "Ti arrendi su Pianfei? Il paese ai piedi delle Alpi Liguri meritava un click.",
    ],
    facts: [
      "Il nome deriverebbe da 'pian-fòi', il 'piano dei faggi' in piemontese, italianizzato in Pianfei.",
      "Dal 1997 la confraternita ospita ogni Natale un presepe meccanico animato; qui visse a lungo il pittore ligure Giuseppe Sacheri.",
    ],
  },
  // Priocca (004176) — Roero; vini Barbera e Nebbiolo d'Alba; chiesa di Santo
  // Stefano (neogotica). Sources: Wikipedia IT (Priocca; Chiesa di Santo
  // Stefano); comune.priocca.cn.it; ecomuseodellerocche.it.
  "004176": {
    win: [
      "Priocca centrata, brau: profumo di Barbera e Nebbiolo del Roero!",
      "Presa Priocca: sviciu, dritto tra le vigne del Roero!",
    ],
    miss: [
      "Manchi Priocca? E il Nebbiolo d'Alba chi lo va a stappare, gadan?",
      "Sbagli Priocca? La chiesa di Santo Stefano coi suoi pinnacoli ti guarda storto, vitun.",
      "Òmmi òmmi, hai perso Priocca: nel Roero il vino è buono, ma la mira no.",
    ],
    fail: [
      "Ti arrendi su Priocca? Niente calice di Roero per te, oh basta là.",
    ],
    facts: [
      "Nel Roero, Priocca produce vini come la Barbera d'Alba e il Nebbiolo d'Alba.",
      "La parrocchiale di Santo Stefano, quasi interamente ricostruita tra il 1651 e il 1658, ha una facciata neogotica a pinnacoli.",
    ],
    campanile: ["/campanili/004176.jpg"],
  },
  // Ceresole Alba (004062) — comune più a nord della provincia; Battaglia di
  // Ceresole 1544; MUbatt. Sources: Wikipedia IT (Ceresole d'Alba; Battaglia
  // di Ceresole); comune.ceresoledalba.cn.it.
  "004062": {
    win: [
      "Ceresole Alba beccata, brau: il comune più a nord della Granda è tuo!",
      "Presa Ceresole: qui nel 1544 si combatté una gran battaglia, e tu hai vinto la tua!",
    ],
    miss: [
      "Manco Ceresole Alba? Nel 1544 qui si combattè sul serio, tu invece ti arrendi, balengu.",
      "Sbagli Ceresole? È il comune più a nord della provincia: madoi, guardavi troppo in basso.",
    ],
    fail: [
      "Ti arrendi su Ceresole Alba? Il museo della battaglia ti aspettava, vitun.",
    ],
    facts: [
      "È il comune più settentrionale della provincia di Cuneo.",
      "Nel 1544 vi si combatté la Battaglia di Ceresole, tra francesi e imperiali; oggi la racconta il museo MUbatt.",
    ],
  },
  // Morozzo (004144) — Cappone di Morozzo, primo Presidio Slow Food (1999);
  // fiera del cappone a dicembre; chiesa della Natività di Maria. Sources:
  // Wikipedia IT (Morozzo); fondazioneslowfood.com; slowfood.it.
  "004144": {
    win: [
      "Morozzo centrata, brau: qui nasce il cappone da Presidio Slow Food!",
      "Presa Morozzo: sviciu come un cappone alla fiera di dicembre!",
    ],
    miss: [
      "Manco Morozzo? E il Cappone di Morozzo chi se lo pappa a Natale, gadan?",
      "Sbagli Morozzo? Primo Presidio Slow Food d'Italia e tu lo lasci nel pollaio, vitun.",
      "Òmmi òmmi, hai perso Morozzo: il cappone ci arrivava prima di te.",
    ],
    fail: [
      "Ti arrendi su Morozzo? Niente cappone alla fiera per te, oh basta là.",
    ],
    facts: [
      "Il Cappone di Morozzo è stato il primo Presidio Slow Food, nato nel 1999.",
      "A metà dicembre il paese celebra la storica Fiera del Cappone, con radici nel primo dopoguerra.",
    ],
    campanile: ["/campanili/004144.jpg"],
  },
  // Grinzane Cavour (004100) — Castello UNESCO, Cavour sindaco per 17 anni;
  // Asta Mondiale del Tartufo Bianco; Enoteca Regionale. Sources: Wikipedia IT
  // (Grinzane Cavour); whc.unesco.org (Langhe-Roero e Monferrato); comune sito.
  "004100": {
    win: [
      "Grinzane Cavour beccata, brau: il castello di Cavour è patrimonio UNESCO!",
      "Presa Grinzane: qui si batte all'asta il tartufo bianco più caro del mondo, e tu hai battuto tutti!",
    ],
    miss: [
      "Manchi Grinzane Cavour? Il conte Camillo ti fa il muso dal suo castello, vitun.",
      "Sbagli Grinzane? All'Asta Mondiale del Tartufo il diamante bianco vola, tu invece resti a terra, balengu.",
      "Òmmi òmmi, hai perso il castello UNESCO delle Langhe: che magra.",
    ],
    fail: [
      "Ti arrendi su Grinzane Cavour? Il castello di Cavour, patrimonio dell'umanità, resta senza il tuo click.",
    ],
    facts: [
      "Il Castello di Grinzane Cavour fa parte del sito UNESCO 'Paesaggio vitivinicolo del Piemonte: Langhe-Roero e Monferrato' (2014).",
      "Camillo Benso conte di Cavour ne fu sindaco per diciassette anni; oggi il castello ospita l'Enoteca Regionale e l'Asta Mondiale del Tartufo Bianco d'Alba.",
    ],
    campanile: ["/campanili/004100.jpg"],
  },
  // Envie (004085) — imbocco Valle Po, ai piedi del Monviso; castello dei
  // marchesi di Saluzzo; leggenda "Ecce viae". Sources: Wikipedia IT (Envie);
  // comune.envie.cn.it; visitcuneese.it.
  "004085": {
    win: [
      "Envie centrata, brau: all'imbocco della Valle Po, sotto il Monviso!",
      "Presa Envie: 'Ecce viae', diceva la leggenda, e tu la via giusta l'hai trovata!",
    ],
    miss: [
      "Manchi Envie? Il Monviso lassù ti guarda deluso, balengu.",
      "Sbagli Envie? Il Po esce dalla montagna proprio qui, ma tu vai per la tangente, vitun.",
    ],
    fail: [
      "Ti arrendi su Envie? Il castello dei marchesi di Saluzzo ti aspettava all'ombra del Monviso.",
    ],
    facts: [
      "Envie sorge all'imbocco della Valle Po, ai piedi del Monviso; una leggenda fa derivare il nome dall'esclamazione 'Ecce viae'.",
      "Il castello, di origine duecentesca dei marchesi di Saluzzo e rifatto in stile neogotico nell'Ottocento, ospitò Cavour e Silvio Pellico.",
    ],
  },
  // Monforte d'Alba (004132) — Barolo; Monfortinjazz all'Auditorium Horszowski;
  // borgo tra i più belli d'Italia; eretici del Mille. Sources: Wikipedia IT
  // (Monforte d'Alba); borghipiubelliditalia.it; monfortinjazz.it.
  "004132": {
    win: [
      "Monforte d'Alba centrata, brau: uno degli undici comuni del Barolo!",
      "Presa Monforte: sale il jazz dall'anfiteatro e tu sali dritto in cima al borgo!",
    ],
    miss: [
      "Manco Monforte d'Alba? E il Barolo chi lo stappa, gadan?",
      "Sbagli Monforte? Il borgo è tra i più belli d'Italia e tu lo scavalchi, vitun.",
      "Òmmi òmmi, hai perso Monforte: il Monfortinjazz suonava e tu stonavi.",
    ],
    fail: [
      "Ti arrendi su Monforte d'Alba? Niente Barolo e niente jazz all'Auditorium Horszowski, oh basta là.",
    ],
    facts: [
      "Monforte d'Alba è uno degli undici comuni che possono produrre il Barolo ed è tra 'I borghi più belli d'Italia'.",
      "L'Auditorium Horszowski, inaugurato nel 1986 dal pianista Mieczysław Horszowski, ospita d'estate il festival Monfortinjazz.",
    ],
    campanile: ["/campanili/004132.jpg"],
  },
  // Demonte (004079) — Valle Stura, area occitana; Palazzo Borelli; Forte della
  // Consolata; Lalla Romano nata qui. Sources: Wikipedia IT (Demonte; Lalla
  // Romano); chambradoc.it; visitcuneese.it.
  "004079": {
    win: [
      "Demonte centrata, brau: cuore della Valle Stura occitana!",
      "Presa Demonte: 'Demont' in occitano, e tu l'hai beccata drech (dritto)!",
    ],
    miss: [
      "Manchi Demonte? La Valle Stura è lassù e tu resti in basso, balengu.",
      "Sbagli Demonte? Il Palazzo Borelli ti guarda male dai suoi affreschi, vitun.",
      "Òmmi òmmi, hai perso Demont: pure il Forte della Consolata era più facile da trovare.",
    ],
    fail: [
      "Ti arrendi su Demonte? Qui nacque Lalla Romano, e il paese meritava un click.",
    ],
    facts: [
      "Demonte, in occitano 'Demont', è il centro principale della bassa Valle Stura ed è comune di minoranza linguistica occitana.",
      "Vi nacque nel 1906 la scrittrice e pittrice Lalla Romano; sopra il paese restano i ruderi del Forte della Consolata, settecentesco.",
    ],
    campanile: ["/campanili/004079.jpg"],
  },
  // San Michele Mondovì (004210) — Monregalese, Valle Corsaglia; battaglia
  // napoleonica 1796 cantata da Carducci ("La bicocca di San Giacomo").
  // Sources: Wikipedia IT (San Michele Mondovì); comune sito; treccani.it.
  "004210": {
    win: [
      "San Michele Mondovì presa, brau: dritto nella Valle Corsaglia!",
      "Centrato San Michele: preciso come l'Arcangelo che gli dà il nome!",
    ],
    miss: [
      "Manchi San Michele Mondovì? La Corsaglia scorre e tu resti all'asciutto, balengu.",
      "Sbagli San Michele? Qui Napoleone diede battaglia nel 1796, tu invece hai perso la tua, vitun.",
    ],
    fail: [
      "Ti arrendi su San Michele Mondovì? Carducci gli dedicò dei versi, e tu neanche un click.",
    ],
    facts: [
      "Il 19 aprile 1796 vi si combatté una battaglia della campagna napoleonica, ricordata da Giosuè Carducci ne 'La bicocca di San Giacomo'.",
      "Il paese, in Valle Corsaglia, era feudo del Marchesato di Ceva; ne restano i ruderi del castello.",
    ],
  },
  // Farigliano (004086) — bassa Langa, Dolcetto di Dogliani; torre civica;
  // Fiera dei puciu e di San Nicolao (dicembre). Sources: Wikipedia IT
  // (Farigliano); comune.farigliano.cn.it; langhe.net.
  "004086": {
    win: [
      "Farigliano centrata, brau: bassa Langa e Dolcetto nel bicchiere!",
      "Presa Farigliano: sotto la torre civica coi tre covoni di grano nello stemma!",
    ],
    miss: [
      "Manco Farigliano? E la Fiera dei puciu chi se la gode, gadan?",
      "Sbagli Farigliano? Il Dolcetto della bassa Langa ti aspettava, vitun.",
    ],
    fail: [
      "Ti arrendi su Farigliano? Niente puciu alla fiera di San Nicolao per te, oh basta là.",
    ],
    facts: [
      "Nella prima settimana di dicembre Farigliano tiene la 'Fiera dei puciu e di San Nicolao': i puciu sono le nespole comuni, tipiche della bassa Langa.",
      "Lo stemma comunale, concesso nel 1933, mostra un braccio che regge tre covoni di grano dorati.",
    ],
  },
  // Frabosa Sottana (004091) — Monregalese; stazioni sci di Prato Nevoso e
  // Artesina; minoranza occitana. Sources: Wikipedia IT (Frabosa Sottana);
  // pratonevoso.com; mondoleski.com.
  "004091": {
    win: [
      "Frabosa Sottana centrata, brau: sci a Prato Nevoso e Artesina!",
      "Presa Frabosa: veloce come una discesa a Prato Nevoso, sviciu!",
    ],
    miss: [
      "Manchi Frabosa Sottana? Le piste di Prato Nevoso ti aspettano, ma tu scii fuori pista, balengu.",
      "Sbagli Frabosa? Artesina è lassù nel Mondolè, tu invece sei rimasto a valle, vitun.",
    ],
    fail: [
      "Ti arrendi su Frabosa Sottana? Niente sciata a Prato Nevoso per te.",
    ],
    facts: [
      "Nel territorio di Frabosa Sottana si trovano le stazioni sciistiche di Prato Nevoso e Artesina, parte del comprensorio Mondolè.",
      "Prato Nevoso ha ospitato più volte l'arrivo di tappa del Giro d'Italia e, nel 2008, del Tour de France.",
    ],
    campanile: ["/campanili/004091.jpg"],
  },
  // Monteu Roero (004140) — Roero, rocche; comune più alto del Roero; Castello
  // dei Roero; Arneis/Nebbiolo; Castagna Granda monumentale. Sources: Wikipedia
  // IT (Monteu Roero); ecomuseodellerocche.it; comune sito.
  "004140": {
    win: [
      "Monteu Roero centrata, brau: il comune più alto del Roero!",
      "Presa Monteu: su tra le rocche del Roero, dritto al Castello dei Roero!",
    ],
    miss: [
      "Manchi Monteu Roero? Le rocche del Roero ti guardano dall'alto, balengu.",
      "Sbagli Monteu? È il paese più alto del Roero e tu miri troppo in basso, vitun.",
      "Òmmi òmmi, hai perso Monteu Roero: e l'Arneis chi lo stappa?",
    ],
    fail: [
      "Ti arrendi su Monteu Roero? Il Castello dei Roero, tra le rocche, meritava il click.",
    ],
    facts: [
      "A 395 metri è il comune più alto del Roero, affacciato sulle caratteristiche rocche.",
      "Il Castello dei Roero conserva capitelli trecenteschi e affreschi seicenteschi; il paese prese nome dai Roero, che lo acquistarono nel 1299.",
    ],
    campanile: ["/campanili/004140.jpg"],
  },
  // Roddi (004194) — Barolo; Castello di Roddi; "Università dei cani da tartufo"
  // (dinastia Monchiero/Barot, elevata a università da Giacomo Morra). Sources:
  // Wikipedia IT (Roddi); centrostudibeppefenoglio.it; bookingpiemonte.it.
  "004194": {
    win: [
      "Roddi centrata, brau: qui c'è l'Università dei cani da tartufo!",
      "Presa Roddi: fiuto da trifolau, hai stanato il comune come un tartufo bianco!",
    ],
    miss: [
      "Manco Roddi? I cani da tartufo hanno più fiuto di te, gadan.",
      "Sbagli Roddi? Il castello dei Barolo ti guarda dall'alto, vitun.",
      "Òmmi òmmi, hai perso Roddi: pure un cane laureato in tartufologia ci arrivava.",
    ],
    fail: [
      "Ti arrendi su Roddi? Il castello e la scuola dei cani da tartufo restano senza il tuo naso.",
    ],
    facts: [
      "A Roddi, nel comprensorio del Barolo, la dinastia Monchiero (i 'Barot') fondò la celebre scuola per cani da tartufo, elevata a 'Università' quando Giacomo Morra ne certificò la validità negli anni Trenta.",
      "Il Castello di Roddi, di origine medievale, domina il centro del paese e fa parte del circuito dei 'Castelli Doc' del Roero e delle Langhe.",
    ],
    campanile: ["/campanili/004194.jpg"],
  },
};
