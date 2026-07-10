import type { MunicipalityFlavor } from "../../types";

/**
 * Tier 2c — mid-sized comuni of the Provincia di Cuneo (Provincia Granda),
 * pop. ~2.1k–2.6k, mostly Roero and pianura cuneese with a couple of Occitan
 * valley towns (Vermenagna, alta Val Po). Dialect words are attested via cn.ts
 * (brau, vitun, balengu, sviciu, madoi, "òmmi òmmi", "oh basta là", blagor,
 * gadan, badòla, tüpin) — no invented grammar; light Occitan touches only where
 * culturally accurate. Facts are verified against ≥2 independent web sources;
 * sources noted per comune. Campanile/landmark photos are licensed from
 * Wikimedia Commons (see CREDIT.md).
 */
export const cnTier2c: Record<string, MunicipalityFlavor> = {
  // Genola (004096) — quaquare (dolce a cuore), patrono San Marziano (3ª dom. di
  // maggio), comune autonomo dal decreto napoleonico del 1808. Sources: Wikipedia
  // IT (Genola); natura.provincia.cuneo.it (Quaquare di Genola); ideawebtv.it.
  "004096": {
    win: [
      "Genola centrata, brau: dolce come una quaquara appena sfornata!",
      "Presa Genola: sviciu, dritto al paese di San Marziano.",
    ],
    miss: [
      "Manchi Genola? E la quaquara a cuore chi se la mangia, gadan?",
      "Vitun, Genola era lì nella pianura: come fai a sbagliarla?",
      "Òmmi òmmi, persa Genola: San Marziano ti guarda male.",
    ],
    fail: ["Ti arrendi su Genola? Niente quaquare per te, allora."],
    facts: [
      "Le 'quaquare' sono i biscotti a forma di cuore tipici di Genola, legati alla festa del patrono San Marziano e celebrati ogni maggio dalla Sagra delle Quaquare.",
      "Genola fu eretta a comune autonomo da un decreto di Napoleone Bonaparte del 1808.",
    ],
  },
  // Sant'Albano Stura (004211) — Oasi naturalistica 'La Madonnina' (>200 specie
  // di uccelli), necropoli longobarda di Ceriolo (2009), sulla Stura presso
  // Fossano. Sources: Wikipedia IT (Sant'Albano Stura); piemonteparchi.it;
  // parcofluvialegessostura.it.
  "004211": {
    win: [
      "Sant'Albano Stura beccata, brau: leggera come un airone sulla Stura!",
      "Presa Sant'Albano: sviciu, dritto all'oasi della Madonnina.",
    ],
    miss: [
      "Manchi Sant'Albano Stura? All'oasi gli uccelli ti han già trovato, e tu no, balengu.",
      "Vitun, persa Sant'Albano sulla Stura: che magra.",
      "Òmmi òmmi, e i Longobardi di Ceriolo dormono ancora là sotto.",
    ],
    fail: [
      "Ti arrendi su Sant'Albano Stura? Niente birdwatching all'oasi, allora.",
    ],
    facts: [
      "L'Oasi naturalistica 'La Madonnina', nata a fine anni '90 da una cava rinaturalizzata sulla Stura, censisce oltre 200 specie di uccelli.",
      "Nel 2009, presso la frazione Ceriolo, fu scoperta un'estesa necropoli longobarda che documenta la presenza di quel popolo nella zona.",
    ],
  },
  // Monticello d'Alba (004142) — Castello Roero (dei conti Roero di Monticello dal
  // 1376), parco romantico di Xavier Kurten, Roero. Sources: roerodimonticello.it;
  // langhe.net; restauroeconservazione.info.
  "004142": {
    win: [
      "Monticello d'Alba centrata, brau: il castello dei Roero saluta dal poggio!",
      "Presa Monticello: sviciu, torri medievali e vista sul Roero!",
    ],
    miss: [
      "Manchi Monticello d'Alba? I Roero comandano lassù dal 1376, e tu ti perdi, balengu.",
      "Vitun, il castello di Monticello era proprio lì in cima: come lo manchi?",
      "Òmmi òmmi, Monticello sfuggita: il conte alza il ponte, adesso.",
    ],
    fail: [
      "Ti arrendi su Monticello d'Alba? Il castello dei Roero resta senza visita.",
    ],
    facts: [
      "Il Castello di Monticello d'Alba appartiene alla stessa famiglia, i conti Roero, dal 1376: è tra i castelli medievali meglio conservati del Piemonte.",
      "Il parco del castello fu disegnato da Xavier Kurten, il paesaggista che introdusse in Piemonte il giardino romantico all'inglese.",
    ],
    campanile: ["/campanili/004142.jpg"],
  },
  // Sanfront (004209) — Balma Boves, villaggio rupestre sotto il Monte Bracco
  // (ecomuseo), alta Val Po ai piedi del Monviso. Sources: fondoambiente.it;
  // guidatorino.com; ghironda.com (Valle Po).
  "004209": {
    win: [
      "Sanfront beccata, brau: su a Balma Boves, il paese nella roccia!",
      "Presa Sanfront: sviciu, alta Val Po sotto il Monviso!",
    ],
    miss: [
      "Manchi Sanfront? A Balma Boves ci vivevano sotto un masso, ma tu il paese lo perdi, balengu.",
      "Vitun, Sanfront era lì in Val Po: come la manchi?",
      "Òmmi òmmi, persa Sanfront: il villaggio nella roccia ti aspettava.",
    ],
    fail: [
      "Ti arrendi su Sanfront? Niente visita al villaggio rupestre di Balma Boves.",
    ],
    facts: [
      "Sopra Sanfront, sul Monte Bracco, sorge Balma Boves: un villaggio costruito al riparo di un enorme tetto di roccia (una 'balma'), abitato stabilmente fino al 1950 circa e oggi ecomuseo.",
      "Sanfront si trova in alta Val Po, ai piedi del Monviso e non lontano dalle sorgenti del fiume Po.",
    ],
    campanile: ["/campanili/004209.jpg"],
  },
  // Vezza d'Alba (004241) — Roero, Santuario della Madonna dei Boschi (affresco
  // gotico dell'Annunciazione confinato nel sottotetto dal 1731), Rocca
  // panoramica. Sources: piemontesacro.it; comune.vezzadalba.cn.it;
  // ecomuseodellerocche.it.
  "004241": {
    win: [
      "Vezza d'Alba centrata, brau: paese di sommità nel cuore del Roero!",
      "Presa Vezza: sviciu, con la Madonna dei Boschi che veglia dal colle.",
    ],
    miss: [
      "Manchi Vezza d'Alba? Il Roero si offende, vitun.",
      "Sbagli Vezza? La Rocca panoramica ti guarda storto, balengu.",
      "Òmmi òmmi, persa Vezza d'Alba per un soffio.",
    ],
    fail: [
      "Ti arrendi su Vezza d'Alba? Peccato, dalla Rocca si vede tutto il Roero.",
    ],
    facts: [
      "Nel santuario campestre della Madonna dei Boschi, la costruzione della volta nel 1731 murò nel sottotetto un prezioso affresco gotico dell'Annunciazione, dipinto a fine Quattrocento.",
      "Nella cripta del santuario furono sepolti, dal 1608 all'Ottocento, vari esponenti dei Roero di Vezza e di Guarene.",
    ],
  },
  // Govone (004099) — Castello Reale sabaudo (Residenza Sabauda UNESCO dal 1997),
  // residenza estiva di Carlo Felice, Magico Paese di Natale, cineserie in carta
  // dipinta. Sources: castellorealedigovone.it; storiepiemontesi.it; langhe.net.
  "004099": {
    win: [
      "Govone centrata, brau: dritto alla reggia sabauda del Roero!",
      "Presa Govone: sviciu come un re Savoia che sceglie la villeggiatura.",
    ],
    miss: [
      "Manchi Govone? Il Castello Reale è patrimonio UNESCO e tu lo salti, balengu?",
      "Vitun, hai perso la residenza estiva di Carlo Felice: che magra.",
      "Òmmi òmmi, e a Natale il Magico Paese ti cercava proprio lì.",
    ],
    fail: [
      "Ti arrendi su Govone? Niente reggia sabauda né mercatini di Natale, allora.",
    ],
    facts: [
      "Il Castello Reale di Govone, acquistato dai Savoia nel 1792 e residenza estiva di re Carlo Felice, è dal 1997 patrimonio UNESCO tra le Residenze Sabaude.",
      "Ogni inverno Govone ospita 'Il Magico Paese di Natale', tra i più celebri mercatini natalizi del Piemonte.",
    ],
    campanile: ["/campanili/004099.jpg"],
  },
  // Cervere (004065) — Porro di Cervere (porro lungo e dolce), Fiera del Porro a
  // novembre, coltivato nelle terre sabbiose della Stura. Sources:
  // fieradelporrocervere.it; piemonteagri.it; comune.cervere.cn.it.
  "004065": {
    win: [
      "Cervere centrata, brau: dolce e lunga come un porro appena cavato!",
      "Presa Cervere: sviciu, dritto alla patria del porro!",
    ],
    miss: [
      "Manchi Cervere? E il porro dolce chi lo va a raccogliere, gadan?",
      "Vitun, persa Cervere: alla Fiera del Porro non ti fanno entrare.",
      "Òmmi òmmi, Cervere sfuggita: che magra di porri.",
    ],
    fail: ["Ti arrendi su Cervere? Niente porro dolce per te, allora."],
    facts: [
      "Il Porro di Cervere, coltivato nelle terre sabbiose lungo la Stura, è famoso per il fusto lungo e sottile e il sapore particolarmente dolce e tenero.",
      "Ogni novembre Cervere celebra il suo prodotto con la Fiera del Porro, mercato e tavolate a base di porro nel centro del paese.",
    ],
    campanile: ["/campanili/004065.jpg"],
  },
  // Cortemilia (004073) — capitale della Nocciola (Tonda Gentile / Nocciola
  // Piemonte IGP), Alta Langa, terrazzamenti in pietra (ecomuseo), Fiera/Sagra
  // della Nocciola. Sources: nocciolaitaliana.it; gitefuoriportainpiemonte.it;
  // piemonteexpo.it.
  "004073": {
    win: [
      "Cortemilia centrata, brau: capitale della nocciola in Alta Langa!",
      "Presa Cortemilia: sviciu, sa di Tonda Gentile e cioccolato!",
    ],
    miss: [
      "Manchi Cortemilia? E la Tonda Gentile chi la sgrana, balengu?",
      "Vitun, persa la capitale della nocciola: che magra di Alta Langa.",
      "Òmmi òmmi, Cortemilia sfuggita: niente Sagra della Nocciola per te.",
    ],
    fail: [
      "Ti arrendi su Cortemilia? I terrazzamenti dell'Alta Langa restano senza click.",
    ],
    facts: [
      "Cortemilia è considerata la 'capitale della nocciola': è nel cuore della zona della Nocciola Piemonte IGP, la varietà Tonda Gentile, e ogni fine agosto ospita la Fiera nazionale della Nocciola.",
      "Attorno al paese i ripidi versanti dell'Alta Langa sono modellati da terrazzamenti in pietra a secco, tutelati da un ecomuseo.",
    ],
    campanile: ["/campanili/004073.jpg"],
  },
  // Trinità (004232) — Castello dei Conti Costa, torre 'della Rossa' ('l cioché),
  // patria di padre Antonio Ferrua (gesuita archeologo, scavi tomba di San Pietro
  // in Vaticano), zona del Cappone di Morozzo. Sources: comune.trinita.cn.it;
  // Wikipedia IT (Trinità); visitcuneese.it.
  "004232": {
    win: [
      "Trinità centrata, brau: dritto sotto 'l cioché, la torre della Rossa!",
      "Presa Trinità: sviciu, feudo dei conti Costa.",
    ],
    miss: [
      "Manchi Trinità? La torre della Rossa ti guarda male, balengu.",
      "Vitun, persa Trinità: e sì che il campanile si vede da lontano.",
      "Òmmi òmmi, Trinità sfuggita: il conte Costa storce il naso.",
    ],
    fail: [
      "Ti arrendi su Trinità? Il castello dei conti Costa resta senza visita.",
    ],
    facts: [
      "Il simbolo di Trinità è la 'torre della Rossa', in piemontese ''l cioché', di probabile origine romana, sulle cui rovine sorse la roccaforte poi legata al Castello dei Conti Costa.",
      "Trinità diede i natali a padre Antonio Ferrua, gesuita e archeologo tra i responsabili degli scavi sotto la Basilica Vaticana alla ricerca della tomba di San Pietro.",
    ],
  },
  // Magliano Alfieri (004113) — Castello degli Alfieri, Museo dei soffitti in
  // gesso e Teatro del Paesaggio, Roero. Sources: castelliaperti.it;
  // abbonamentomusei.it; amicicastelloalfieri.org.
  "004113": {
    win: [
      "Magliano Alfieri centrata, brau: su al castello dei soffitti in gesso!",
      "Presa Magliano Alfieri: sviciu, con vista sui filari del Roero.",
    ],
    miss: [
      "Manchi Magliano Alfieri? Il castello degli Alfieri ti guarda dall'alto, balengu.",
      "Vitun, persa Magliano Alfieri: i soffitti in gesso restano senza pubblico.",
      "Òmmi òmmi, Magliano Alfieri sfuggita per un soffio.",
    ],
    fail: [
      "Ti arrendi su Magliano Alfieri? Niente Museo dei soffitti in gesso per te.",
    ],
    facts: [
      "Il Castello di Magliano Alfieri ospita il Museo dei soffitti in gesso, che documenta i decori in gesso delle case contadine di Roero, Astigiano e Monferrato tra Sei e Ottocento.",
      "Dal 2015 il castello accoglie anche il 'Teatro del Paesaggio', museo multimediale sulle colline di Langa e Roero.",
    ],
    campanile: ["/campanili/004113.jpg"],
  },
  // Castagnito (004046) — Roero, sottozona Castellinaldo Barbera d'Alba, feudo
  // dei Roero (Rotari) da cui prese il nome. Sources: langhe.net (Castagnito);
  // vinaiolidelcastellinaldo.com; consorziodelroero.it.
  "004046": {
    win: [
      "Castagnito centrata, brau: colline di Barbera nel Roero orientale!",
      "Presa Castagnito: sviciu, un calice di Castellinaldo e via!",
    ],
    miss: [
      "Manchi Castagnito? E la Barbera del Roero chi se la beve, balengu?",
      "Vitun, persa Castagnito tra le colline: come fai?",
      "Òmmi òmmi, Castagnito sfuggita per un soffio.",
    ],
    fail: [
      "Ti arrendi su Castagnito? Niente brindisi di Barbera d'Alba, allora.",
    ],
    facts: [
      "Castagnito è tra i comuni del Roero orientale compresi nella sottozona 'Castellinaldo' del Barbera d'Alba DOC.",
      "Il paese appartenne alla città di Asti, che lo diede in feudo ai Roero (Rotari), da cui il castello e il borgo presero il nome.",
    ],
  },
  // Robilante (004185) — Valle Vermenagna (valle occitana), Museo della
  // Fisarmonica, forte tradizione musicale (courenta e balèt). Sources:
  // vermenagna-roya.eu; museofisarmonica.com; comune.robilante.cn.it.
  "004185": {
    win: [
      "Robilante centrata, brau: su in Vermenagna, a passo di courenta!",
      "Presa Robilante: sviciu come una fisarmonica in festa!",
    ],
    miss: [
      "Manchi Robilante? In Vermenagna suonano tutti, e tu stoni, balengu.",
      "Vitun, persa Robilante: la fisarmonica ti aspettava.",
      "Òmmi òmmi, Robilante sfuggita: niente balèt per te.",
    ],
    fail: [
      "Ti arrendi su Robilante? Il Museo della Fisarmonica resta senza visita.",
    ],
    facts: [
      "Robilante, in Valle Vermenagna (una delle valli occitane del Piemonte), ospita dal 2005 il Museo della Fisarmonica, dedicato al costruttore e accordatore locale Giuseppe Vallauri detto 'Notou Sounadour'.",
      "Il paese ha una tradizione musicale fortissima, con le danze occitane della courenta e del balèt suonate soprattutto con la fisarmonica a bottoni.",
    ],
    campanile: ["/campanili/004185.jpg"],
  },
  // Magliano Alpi (004114) — patrona la Madonna del Carmine; parte della dote di
  // Valentina Visconti sposa di Luigi d'Orléans; frazioni Magliano Soprano e
  // Sottano. Sources: Wikipedia EN (Magliano Alpi); sapere.it; italiapedia.it.
  "004114": {
    win: [
      "Magliano Alpi centrata, brau: dritto nella pianura del Monregalese!",
      "Presa Magliano Alpi: sviciu, tra Magliano Soprano e Sottano!",
    ],
    miss: [
      "Manchi Magliano Alpi? Vitun, era lì in pianura, liscia liscia.",
      "Sbagli Magliano Alpi? Òmmi òmmi, la Madonna del Carmine ti guarda male.",
      "Persa Magliano Alpi per un soffio, balengu.",
    ],
    fail: ["Ti arrendi su Magliano Alpi? Peccato, era a un passo da Mondovì."],
    facts: [
      "Magliano Alpi si divide storicamente nei due nuclei di Magliano Soprano e Magliano Sottano; patrona è la Madonna del Carmine, festeggiata il 16 luglio.",
      "Nel Medioevo il feudo entrò a far parte della dote di Valentina Visconti, andata sposa a Luigi d'Orléans, prima di passare ai Savoia nel 1601.",
    ],
  },
  // Tarantasca (004225) — Sagra del Coniglio (primato provinciale d'allevamento),
  // comune autonomo dal 1808 (staccato da Busca). Sources: comune.tarantasca.cn.it;
  // laguida.it; Wikipedia EN (Tarantasca).
  "004225": {
    win: [
      "Tarantasca centrata, brau: svelto come un coniglio in fuga!",
      "Presa Tarantasca: sviciu, dritto nella pianura buschese.",
    ],
    miss: [
      "Manchi Tarantasca? Il coniglio scappa più svelto di te, vitun.",
      "Sbagli Tarantasca? Òmmi òmmi, era lì vicino a Busca, balengu.",
      "Persa Tarantasca per un soffio: che magra.",
    ],
    fail: [
      "Ti arrendi su Tarantasca? Niente Sagra del Coniglio per te, allora.",
    ],
    facts: [
      "Tarantasca è nota per la Sagra del Coniglio: il paese vanta un primato provinciale per numero di conigli allevati.",
      "Fu un gruppo di case dipendente da Busca finché un decreto napoleonico del 1808 la elevò a comune autonomo.",
    ],
  },
  // Corneliano d'Alba (004072) — Roero, torre medievale decagonale (~23 m, unica a
  // dieci lati del centro-nord Italia), lungo l'antica strada romana Alba-Torino
  // (fundus della gens Cornelia). Sources: torriantiche.it; ecomuseodellerocche.it;
  // europeanheritagedays.com.
  "004072": {
    win: [
      "Corneliano d'Alba centrata, brau: dieci lati di torre, tutti tuoi!",
      "Presa Corneliano: sviciu, precisa come la torre decagonale!",
    ],
    miss: [
      "Manchi Corneliano d'Alba? Una torre a dieci lati e non ne becchi uno, balengu.",
      "Vitun, persa Corneliano: la torre decagonale ti guarda da 23 metri.",
      "Òmmi òmmi, Corneliano sfuggita per un soffio.",
    ],
    fail: [
      "Ti arrendi su Corneliano d'Alba? La torre decagonale resta senza visita.",
    ],
    facts: [
      "La torre medievale di Corneliano d'Alba, alta quasi 23 metri, ha una pianta decagonale: è l'unica torre a dieci lati del centro-nord Italia, eretta dai De Brayda nel Duecento.",
      "Corneliano sorse come 'fundus' della gens Cornelia lungo l'antica strada romana che collegava Alba a Torino, da cui prende il nome.",
    ],
    campanile: ["/campanili/004072.jpg"],
  },
};
