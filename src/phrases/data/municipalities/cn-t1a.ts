import type { MunicipalityFlavor } from "../../types";

/**
 * Tier 1a — the flagship towns of the Provincia di Cuneo (Provincia Granda).
 * Dialect words are attested via cn.ts (brau, vitun, balengu, sviciu, madoi,
 * "òmmi òmmi", "oh basta là", blagor, gadan) — no invented grammar. Facts are
 * verified against ≥2 independent web sources; sources noted per comune.
 * Campanile/landmark photos are licensed from Wikimedia Commons (see CREDIT.md).
 */
export const cnTier1a: Record<string, MunicipalityFlavor> = {
  // Cuneo (004078) — capoluogo, "Provincia Granda", torre civica, assedio 1744,
  // cuneese al rhum. Sources: Wikipedia IT (Torre civica di Cuneo; Assedio di
  // Cuneo 1744); comune.cuneo.it; laguida.it.
  "004078": {
    win: [
      "Cuneo, il capoluogo della Provincia Granda: brau, dritto al centro!",
      "Presa la Granda per la testa: preciso come la torre civica.",
      "Capoluogo beccato al volo, altro che balengu!",
    ],
    miss: [
      "Sbagli il capoluogo? Òmmi òmmi, e la torre civica ti guarda male.",
      "Manco Cuneo? La Provincia Granda si offende, vitun.",
      "Cuneo è lì, grande come una fetta di cuneese al rhum: come fai a mancarla?",
    ],
    fail: [
      "Ti arrendi sul capoluogo? La città che resistette all'assedio del 1744, eh.",
      "Salti pure Cuneo, ma la Granda non si dimentica.",
    ],
    facts: [
      "La torre civica, alta 52 metri con 132 gradini, domina il centro storico dal Trecento.",
      "Nel 1744 resistette all'assedio franco-spagnolo: la battaglia di Madonna dell'Olmo si combatté alle sue porte.",
      "È la patria del 'cuneese al rhum', cioccolatino di meringa e crema al rum reso celebre dalla ditta Arione.",
    ],
    campanile: ["/campanili/004078.jpg"],
  },
  // Alba (004003) — "città delle cento torri", tartufo bianco, Ferrero/Nutella.
  // Sources: Wikipedia IT (Alba); Fiera Internazionale del Tartufo Bianco;
  // welcomelangheroero.com; meetpiemonte.com.
  "004003": {
    win: [
      "Alba delle cento torri, brau: profumo di tartufo!",
      "Centrata la capitale delle Langhe, sviciu che non sei altro.",
      "Alba presa: sa di nocciola e di Nutella, questa!",
    ],
    miss: [
      "Manchi Alba? E il tartufo bianco chi lo va a cercare, balengu?",
      "Vitun, hai perso la città della Nutella: che magra!",
      "Cento torri e non ne trovi una: òmmi òmmi, Alba era lì.",
    ],
    fail: [
      "Ti arrendi su Alba? Niente Fiera del Tartufo Bianco per te.",
      "Salti Alba, la città delle cento torri: oh basta là.",
    ],
    facts: [
      "È detta 'città delle cento torri' per le torri e case-torri medievali che ne segnano lo skyline.",
      "Ogni autunno ospita la Fiera Internazionale del Tartufo Bianco d'Alba.",
      "Qui nel 1946 Pietro Ferrero fondò la Ferrero, dalla cui pasta gianduja nascerà la Nutella.",
    ],
    campanile: ["/campanili/004003.jpg"],
  },
  // Bra (004029) — sede di Slow Food, salsiccia di Bra (vitello), Bra DOP.
  // Sources: slowfood.it; fondazioneslowfood.com (Salsiccia di Bra);
  // dopitalianfood.com (Bra DOP); comune.bra.cn.it.
  "004029": {
    win: [
      "Bra centrata, brau: capitale dello Slow Food!",
      "Presa Bra, patria della salsiccia di vitello: sviciu!",
      "Bra beccata: qui si mangia piano ma tu hai cliccato svelto!",
    ],
    miss: [
      "Manco Bra? E la salsiccia di vitello te la sogni, gadan.",
      "Sbagli la casa dello Slow Food: qui si va lenti, ma tu clicchi a caso.",
      "Vitun, hai perso Bra: e il formaggio DOP chi lo assaggia?",
    ],
    fail: [
      "Salti Bra? Niente salsiccia, niente formaggio Bra DOP.",
      "Ti arrendi sulla culla dello Slow Food: mangia piano e pensaci.",
    ],
    facts: [
      "È la sede di Slow Food, il movimento fondato da Carlo Petrini nel 1986.",
      "La salsiccia di Bra è fatta di vitello: un privilegio concesso ai macellai da re Carlo Alberto nel 1847.",
      "Dà il nome al Bra, formaggio DOP prodotto nelle versioni tenero e duro.",
    ],
    campanile: ["/campanili/004029.jpg"],
  },
  // Fossano (004089) — Castello degli Acaja, campanile del duomo.
  // Sources: Wikipedia IT (Fossano; Castello degli Acaja);
  // museodiffusocuneese.it; castelliaperti.it.
  "004089": {
    win: [
      "Fossano beccata, brau: il castello degli Acaja saluta!",
      "Presa la città degli Acaja, dritta come il campanile del duomo.",
      "Fossano centrata: quattro torri e un ponte levatoio, tutto tuo!",
    ],
    miss: [
      "Manchi Fossano? Le quattro torri degli Acaja ti guardano storto, vitun.",
      "Sbagli Fossano? Il principe d'Acaja alza il ponte levatoio, balengu.",
      "Òmmi òmmi, hai perso il castello degli Acaja per un soffio.",
    ],
    fail: [
      "Ti arrendi su Fossano: il castello degli Acaja resta senza di te.",
      "Salti Fossano? Peccato, quel castello è il simbolo della città.",
    ],
    facts: [
      "Il Castello degli Acaja, con le sue quattro torri quadrate, fu iniziato nel 1314 dal principe Filippo I e compiuto nel 1332.",
      "Gli Acaja erano un ramo cadetto dei Savoia; estintasi la casata, il castello passò proprio ai Savoia.",
    ],
    campanile: ["/campanili/004089.jpg"],
  },
  // Mondovì (004130) — funicolare Breo↔Piazza, raduno aerostatico (mongolfiere),
  // Torre del Belvedere (ex campanile di Sant'Andrea). Sources: comune.mondovi.cn.it;
  // aeroclubmondovi.it; Wikipedia IT (Mondovì; Torre del Belvedere).
  "004130": {
    win: [
      "Mondovì centrata, brau: su con la funicolare fino a Piazza!",
      "Presa Mondovì: leggero come una mongolfiera all'Epifania.",
      "Mondovì beccata: dal Belvedere si vede tutta la Granda!",
    ],
    miss: [
      "Manco Mondovì? La funicolare va su e giù, ma tu resti a terra, balengu.",
      "Sbagli Mondovì? All'Epifania le mongolfiere ti cercano, vitun.",
      "Òmmi òmmi, Mondovì Piazza era proprio lassù in cima al colle.",
    ],
    fail: [
      "Salti Mondovì? Dal Belvedere si vedeva benissimo, eh.",
      "Ti arrendi su Mondovì: niente volo in mongolfiera per te.",
    ],
    facts: [
      "Una funicolare collega il rione Breo a Mondovì Piazza, il quartiere alto in cima al colle.",
      "All'Epifania ospita il Raduno Aerostatico Internazionale, con decine di mongolfiere in volo.",
      "La Torre del Belvedere era il campanile della chiesa di Sant'Andrea, poi demolita dai francesi.",
    ],
    campanile: ["/campanili/004130.jpg"],
  },
  // Savigliano (004215) — piazza Santorre di Santarosa, torre civica, Museo
  // Ferroviario Piemontese (Pendolino). Sources: Wikipedia IT (Savigliano);
  // museoferroviariopiemontese.it; laguida.it.
  "004215": {
    win: [
      "Savigliano presa, brau: piazza Santarosa è tutta tua!",
      "Centrata la città del Pendolino: sviciu e veloce come un treno.",
      "Savigliano beccata: che bella la piazza sotto la torre civica!",
    ],
    miss: [
      "Manchi Savigliano? La torre civica su piazza Santarosa ti guarda male.",
      "Sbagli la patria del Pendolino: e sì che era veloce da trovare, vitun.",
      "Òmmi òmmi, Savigliano ti è sfuggita come un treno perso.",
    ],
    fail: [
      "Ti arrendi su Savigliano: niente giro sotto i portici di piazza Santarosa.",
      "Salti Savigliano? Peccato, quella piazza è tra le più belle del Piemonte.",
    ],
    facts: [
      "Piazza Santorre di Santarosa è una delle piazze medievali meglio conservate del Piemonte, con portici e case-torri.",
      "Ospita il Museo Ferroviario Piemontese; nelle sue officine venne costruito il Pendolino.",
    ],
    campanile: ["/campanili/004215.jpg"],
  },
  // Saluzzo (004203) — capitale del Marchesato, Silvio Pellico, la Castiglia,
  // Casa Cavassa, Monviso. Sources: Wikipedia IT (La Castiglia; Marchesato di
  // Saluzzo); comune.saluzzo.cn.it; visitcuneese.it.
  "004203": {
    win: [
      "Saluzzo centrata, brau: capitale del Marchesato!",
      "Presa la città di Silvio Pellico, ai piedi del Monviso: che vista!",
      "Saluzzo beccata: la Castiglia dei marchesi ti fa il baciamano!",
    ],
    miss: [
      "Manco Saluzzo? Il marchese ti chiude in Castiglia, balengu.",
      "Sbagli la patria di Silvio Pellico: 'Le mie prigioni' le scrivi tu, adesso.",
      "Vitun, hai perso l'antica capitale del Marchesato: che sbadataggine.",
    ],
    fail: [
      "Salti Saluzzo? L'antica capitale del Marchesato meritava un click.",
      "Ti arrendi su Saluzzo: il Monviso lassù ti guarda deluso.",
    ],
    facts: [
      "Fu capitale del Marchesato di Saluzzo per oltre quattro secoli, fino al 1548.",
      "Diede i natali a Silvio Pellico, autore di 'Le mie prigioni', nel 1789.",
      "La Castiglia, residenza fortificata dei marchesi, fu poi usata come carcere fino al 1992.",
    ],
    campanile: ["/campanili/004203.jpg"],
  },
  // Borgo San Dalmazzo (004025) — l'antica Pedona, Fiera Fredda, San Dalmazzo
  // martire, ravioli/lumaca, abbazia. Sources: Wikipedia EN (Borgo San Dalmazzo);
  // fierafredda.it; cuneodice.it; museoabbazia.it.
  "004025": {
    win: [
      "Borgo San Dalmazzo beccata, brau: profumo di ravioli e Fiera Fredda!",
      "Presa la vecchia Pedona: sviciu, dritto all'abbazia.",
      "Borgo centrato: San Dalmazzo ti benedice il click!",
    ],
    miss: [
      "Manco Borgo San Dalmazzo? La lumaca della Fiera Fredda va più svelta di te, vitun.",
      "Sbagli il Borgo? San Dalmazzo si rigira nella cripta, balengu.",
      "Òmmi òmmi, e l'antica Pedona te la sei lasciata scappare.",
    ],
    fail: [
      "Ti arrendi sul Borgo? Niente ravioli alla Fiera Fredda per te.",
      "Salti Borgo San Dalmazzo? Peccato, la fiera più fredda dell'anno.",
    ],
    facts: [
      "La Fiera Fredda, celebrata dal 1569, onora il patrono San Dalmazzo ogni 5 dicembre ed è famosa per la lumaca.",
      "L'antica Pedona prese il nome da San Dalmazzo, martirizzato secondo la tradizione nel 254.",
    ],
    campanile: ["/campanili/004025.jpg"],
  },
  // Busca (004034) — Castello del Roccolo (marchesi d'Azeglio), torre Rossa,
  // cappella di Santo Stefano con affreschi dei Biazaci. Sources: Wikipedia IT
  // (Busca; Castello del Roccolo); comune.busca.cn.it; visitcuneese.it.
  "004034": {
    win: [
      "Busca centrata, brau: su al Castello del Roccolo!",
      "Presa Busca, all'ombra della torre Rossa: sviciu!",
      "Busca beccata: i d'Azeglio ti aprono il Roccolo!",
    ],
    miss: [
      "Manchi Busca? Il Castello del Roccolo ti guarda dall'alto, balengu.",
      "Sbagli Busca? La torre Rossa era lì da secoli, vitun.",
      "Òmmi òmmi, Busca ti è sfuggita: il Roccolo resta chiuso.",
    ],
    fail: [
      "Salti Busca? Il Roccolo dei d'Azeglio resta senza visita.",
      "Ti arrendi su Busca: peccato, quel castello romantico valeva il click.",
    ],
    facts: [
      "Sopra il paese sorge il Castello del Roccolo, dimora romantica dei marchesi Tapparelli d'Azeglio dal 1831.",
      "La cappella di Santo Stefano conserva affreschi dei fratelli Biazaci, pittori buschesi del Quattrocento.",
    ],
    campanile: ["/campanili/004034.jpg"],
  },
};
