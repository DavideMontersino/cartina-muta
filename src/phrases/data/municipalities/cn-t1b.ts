import type { MunicipalityFlavor } from "../../types";

/**
 * Cuneo comuni — Tier 1b (flagship towns, full richness).
 * Dialect words attested via cn.ts or web sources (brau, vitun, balengu,
 * sviciu, madoi, òmmi òmmi, oh basta là); Occitan "benvengut" (welcome) used
 * for the Valli Occitane (Maira/Grana). Facts verified against ≥2 sources
 * (Wikipedia IT + comune/institute/press sites) — noted per comune.
 */
export const cnTier1b: Record<string, MunicipalityFlavor> = {
  // Racconigi (004179) — Castello Reale (Residenza Sabauda UNESCO), Centro
  // Cicogne LIPU, Accordo di Racconigi 1909. Sources: Wikipedia IT
  // (Castello Reale di Racconigi; Accordo di Racconigi); parcopopiemontese.it.
  "004179": {
    win: [
      "Racconigi, brau! Castello reale e cicogne sul tetto: mira da re.",
      "Presa netta: manco lo zar Nicola II sbagliava strada per il castello.",
      "Sviciu, dritto alla reggia delle cicogne!",
    ],
    miss: [
      "Vitun, le cicogne di Racconigi ti guardano dall'alto e scuotono il becco.",
      "Madoi, hai mancato la reggia dei Savoia: che figura da balengu.",
      "Òmmi òmmi, il castello grande come una città e tu lo perdi?",
    ],
    fail: [
      "Ti sei arreso su Racconigi: niente castello reale, niente cicogne.",
      "Oh basta là, la reggia delle cicogne era lì e l'hai lasciata perdere.",
    ],
    facts: [
      "Il Castello Reale di Racconigi è dal 1997 patrimonio UNESCO tra le Residenze Sabaude.",
      "Il Centro Cicogne e Anatidi, nato nel 1985 con la LIPU, ha reintrodotto in Italia la cicogna bianca.",
      "Nel 1909 al castello fu firmato il segreto Accordo di Racconigi tra Vittorio Emanuele III e lo zar Nicola II.",
    ],
    campanile: ["/campanili/004179.jpg"],
  },
  // Boves (004028) — eccidio del 19 settembre 1943, Città Medaglia d'Oro,
  // ai piedi della Bisalta. Register kept respectful (no joking on the
  // tragedy). Sources: Wikipedia IT (Eccidio di Boves); Quirinale.it (MOVM).
  "004028": {
    win: [
      "Boves presa: rispetto a una Città Medaglia d'Oro, ai piedi della Bisalta.",
      "Brau, hai onorato la memoria: Boves dritta al primo colpo.",
      "Sviciu, sotto la Bisalta ci arrivi senza esitare.",
    ],
    miss: [
      "Vitun, sotto la Bisalta non ci arrivi? Guarda meglio.",
      "Madoi, hai mancato Boves: la Bisalta la vedi da mezza provincia.",
      "Òmmi òmmi, e la montagna a due punte non ti dice niente?",
    ],
    fail: [
      "Ti sei arreso su Boves, Città Medaglia d'Oro della Resistenza: da ricordare, non da saltare.",
    ],
    facts: [
      "Il 19 settembre 1943 Boves subì la prima rappresaglia nazista contro i civili in Italia dopo l'armistizio.",
      "Per il sacrificio della Resistenza è decorata di Medaglia d'Oro al Valor Militare (1963) e al Valor Civile.",
      "Sorge ai piedi della Bisalta, la montagna a due punte simbolo del Cuneese.",
    ],
    campanile: ["/campanili/004028.jpg"],
  },
  // Cherasco (004067) — capitale delle lumache (Istituto di Elicicoltura),
  // le sette "paci di Cherasco", Baci di Cherasco, impianto sabaudo.
  // Sources: Wikipedia IT (Cherasco; Baci di Cherasco); istitutodielicicoltura.com.
  "004067": {
    win: [
      "Cherasco, brau! Città delle lumache e delle sette paci: colpo da diplomatico.",
      "Preciso tra i portici sabaudi: Cherasco beccata al volo, sviciu.",
      "Presa netta, dolce come un bacio di Cherasco.",
    ],
    miss: [
      "Vitun, lento come una lumaca di Cherasco... e manco ci arrivi.",
      "Madoi, tra tante paci firmate qui, con la cartina fai solo guerra.",
      "Òmmi òmmi, hai mancato la capitale delle chiocciole.",
    ],
    fail: [
      "Ti sei arreso su Cherasco: niente lumache, niente baci di cioccolato.",
      "Oh basta là, la città delle sette paci e tu non trovi manco la tregua.",
    ],
    facts: [
      "Cherasco è capitale italiana dell'elicicoltura: dal 1973 vi ha sede l'Istituto Internazionale di Elicicoltura.",
      "Tra le sue mura furono firmati trattati storici, tra cui l'armistizio imposto da Napoleone al Regno di Sardegna nel 1796.",
      "I Baci di Cherasco, cioccolatini di fondente e nocciola Piemonte IGP, nacquero nel 1881 nella pasticceria Barbero.",
    ],
    campanile: ["/campanili/004067.jpg"],
  },
  // Barge (004012) — pietra di Luserna (gneiss), primo nucleo partigiano
  // di "Barbato" Colajanni, storica rivalità con Bagnolo. Sources: comune.barge.cn.it;
  // Wikipedia IT / EN (Pompeo Colajanni); sentieriresistenti.org.
  "004012": {
    win: [
      "Barge presa: dura come la sua pietra di Luserna, brau.",
      "Sviciu, dritto tra le cave: Barge al primo colpo.",
      "Beccata netta, solida come una lastra di gneiss.",
    ],
    miss: [
      "Vitun, Barge e Bagnolo litigano per le cave e tu le sbagli tutte e due.",
      "Madoi, dura come la pietra e tu ci scivoli sopra.",
      "Òmmi òmmi, mancato il paese dei cavatori di pietra.",
    ],
    fail: [
      "Ti sei arreso su Barge: la pietra di Luserna resta lì, tu no.",
      "Oh basta là, manco il paese delle cave sei riuscito a inchiodare.",
    ],
    facts: [
      "Barge è al centro del bacino estrattivo della pietra di Luserna, gneiss lavorato dall'Ottocento.",
      "Nel settembre 1943 vi nacque uno dei primi nuclei partigiani del Piemonte, guidato da Pompeo Colajanni 'Barbato'.",
      "Con la vicina Bagnolo Piemonte si contende da sempre il primato delle cave di pietra.",
    ],
    campanile: ["/campanili/004012.jpg"],
  },
  // Dronero (004082) — porta della Val Maira, Ponte del Diavolo (1428),
  // cuore occitano (Espaci Occitan), collegio di Giolitti. Sources: Wikipedia
  // IT (Dronero; Giovanni Giolitti); vallemaira.org; visitcuneese.it.
  "004082": {
    win: [
      "Dronero beccata: benvengut an Occitània, porta della Val Maira!",
      "Brau, dritto sul Ponte del Diavolo senza vendere l'anima.",
      "Sviciu, la porta della Val Maira è tua.",
    ],
    miss: [
      "Vitun, il Diavolo ti frega come i droneresi fregarono lui: col cane.",
      "Madoi, hai mancato la porta della Val Maira, occitana fino al midollo.",
      "Òmmi òmmi, manco il ponte a schiena d'asino vedi?",
    ],
    fail: [
      "Ti sei arreso su Dronero: il Ponte del Diavolo resiste dal 1428, la tua memoria no.",
      "Oh basta là, la porta dell'Occitania cuneese e tu non l'hai aperta.",
    ],
    facts: [
      "Il Ponte del Diavolo (o Ponte Vecchio), a schiena d'asino, fu costruito nel 1428 sul torrente Maira.",
      "Dronero è la 'porta della Val Maira' e sede dell'Espaci Occitan, centro della cultura e lingua occitana.",
      "Fu per decenni il collegio elettorale di Giovanni Giolitti, cinque volte presidente del Consiglio.",
    ],
    campanile: ["/campanili/004082.jpg"],
  },
  // Centallo (004061) — pianura del fagiolo e del peperone, patria del
  // cardinale Michele Pellegrino, castello distrutto nel 1589. Sources:
  // Wikipedia IT (Centallo; Michele Pellegrino); comune.centallo.cn.it.
  "004061": {
    win: [
      "Centallo presa, brau! Terra di fagioli e peperoni in pianura.",
      "Sviciu, dritto tra i campi centallesi.",
      "Beccata liscia, piatta e precisa come la pianura di Centallo.",
    ],
    miss: [
      "Vitun, in pianura piatta come Centallo e la sbagli lo stesso?",
      "Madoi, mancato Centallo: manco il campanile di San Giovanni ti aiuta.",
      "Òmmi òmmi, i centallesi ti guardano storto.",
    ],
    fail: ["Ti sei arreso su Centallo: niente sagra del fagiolo per te."],
    facts: [
      "A Roata Chiusani, frazione di Centallo, nacque il cardinale Michele Pellegrino, arcivescovo di Torino.",
      "Ospita la biennale Sagra del Fagiolo e del Peperone, prodotti tipici della pianura cuneese.",
      "Il suo castello fu distrutto nel 1589 durante le guerre franco-spagnole.",
    ],
    campanile: ["/campanili/004061.jpg"],
  },
  // Caraglio (004040) — Filatoio Rosso (più antico setificio d'Europa),
  // porta della Val Grana occitana e del Castelmagno. Sources: Wikipedia IT
  // (Filatoio Rosso di Caraglio); filatoiocaraglio.it; cultura.gov.it.
  "004040": {
    win: [
      "Caraglio presa: il Filatoio Rosso, più antico setificio d'Europa, è tuo!",
      "Sviciu, dritto alla porta della Val Grana.",
      "Brau, filata liscia come la seta del Filatoio.",
    ],
    miss: [
      "Vitun, ti sei ingarbugliato peggio di un filo di seta.",
      "Madoi, mancata la porta della Val Grana, quella del Castelmagno.",
      "Òmmi òmmi, il Filatoio è rosso apposta perché tu lo veda, e niente.",
    ],
    fail: [
      "Ti sei arreso su Caraglio: niente seta, niente Val Grana.",
      "Oh basta là, il più antico setificio d'Europa e tu ci scivoli sopra.",
    ],
    facts: [
      "Il Filatoio Rosso di Caraglio, costruito nel 1676-78, è il più antico setificio conservato in Europa.",
      "Caraglio è la porta della Valle Grana, valle occitana patria del formaggio Castelmagno DOP.",
      "Il conte Galleani lo fece erigere accanto alla sorgente Celleri per alimentare i torcitoi ad acqua.",
    ],
    campanile: ["/campanili/004040.jpg"],
  },
  // Verzuolo (004240) — la Cartiera Burgo, il castello dei marchesi di
  // Saluzzo (1377), il borgo medievale. Sources: Wikipedia IT (Verzuolo);
  // castellodiverzuolo.it; comune.verzuolo.cn.it.
  "004240": {
    win: [
      "Verzuolo presa: paese della carta e del castello sul poggio, brau.",
      "Sviciu, dritto alla Cartiera Burgo.",
      "Beccata netta, stampata come un foglio della Burgo.",
    ],
    miss: [
      "Vitun, con tutta la carta della Burgo, e non scrivi la risposta giusta?",
      "Madoi, mancato Verzuolo e il suo castello dei marchesi.",
      "Òmmi òmmi, il castello domina il borgo e tu lo perdi.",
    ],
    fail: ["Ti sei arreso su Verzuolo: niente cartiera, niente castello."],
    facts: [
      "La Cartiera Burgo, fondata dall'ingegner Luigi Burgo a inizio Novecento, è il simbolo industriale di Verzuolo.",
      "Il castello dei marchesi di Saluzzo, del 1377, nel 1477 respinse l'assalto di Carlo I di Savoia.",
      "Il borgo antico conserva l'impianto medievale ai piedi del castello.",
    ],
    campanile: ["/campanili/004240.jpg"],
  },
};
