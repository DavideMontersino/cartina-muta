import type { MunicipalityFlavor } from "../../types";

/**
 * Tier 1c — flagship Cuneo comuni (full richness).
 * Facts verified against ≥2 web sources (Wikipedia IT/EN, comune sites,
 * visitcuneese, ecomuseo/langhe portals, local press). Dialect kept light and
 * only with words attested in cn.ts (brau, vitun, balengu, sviciu, madoi,
 * òmmi òmmi, "oh basta là", blagor, gadan, tüpin) or standard Italian.
 */
export const cnTier1c: Record<string, MunicipalityFlavor> = {
  // Sommariva del Bosco (004222) — "Porta del Roero", castello Seyssel d'Aix,
  // il "Paese di Fiaba". Sources: Wikipedia IT; ecomuseodellerocche.it; comune site.
  "004222": {
    win: [
      "Sommariva del Bosco, brau: hai varcato la Porta del Roero!",
      "Presa la Porta del Roero, sviciu come una fata madrina.",
      "Dritto a Sommariva: il paese di fiaba non ti ha incantato!",
    ],
    miss: [
      "Madoi, la Porta del Roero era lì e tu passi oltre?",
      "Vitun, a Sommariva ti sei addormentato come la Bella nel Bosco!",
      "Òmmi òmmi, sbagli pure il paese di fiaba.",
    ],
    fail: [
      "Ti arrendi su Sommariva del Bosco: niente miele, niente fiaba.",
      "Salti la Porta del Roero e resti fuori dal bosco incantato.",
    ],
    facts: [
      'È soprannominata la "Porta del Roero", primo paese che si incontra salendo dalla pianura.',
      'Dal 2006 il centro storico è un "Paese di Fiaba": un Sentiero di Fiaba racconta la Bella Addormentata di Perrault.',
      "Il castello appartiene ai marchesi Seyssel d'Aix, che lo ottennero nel 1733.",
    ],
    campanile: ["/campanili/004222.jpg"],
  },
  // Bagnolo Piemonte (004009) — castello Malingri, pietra di Luserna, frutta.
  // Sources: castellodibagnolo.it; comune.bagnolo.cn.it; archeocarta.org.
  "004009": {
    win: [
      "Bagnolo beccata, dura come la pietra di Luserna!",
      "Brau, il castello Malingri è tuo senza assedio.",
      "Sviciu: Bagnolo presa al volo, dai Malingri ai giorni nostri.",
    ],
    miss: [
      "Vitun, ti scivola Bagnolo come acqua sulla pietra di Luserna.",
      "Madoi, il castello Malingri regge da mille anni e tu no.",
      "Òmmi òmmi, la sbagli: qui la pietra è più solida della tua memoria.",
    ],
    fail: [
      "Salti Bagnolo Piemonte: niente castello Malingri, niente pietra di Luserna.",
      "Ti arrendi ai piedi del Monviso: Bagnolo resta lassù senza di te.",
    ],
    facts: [
      "Il castello è dei Malingri dal 1412 e la famiglia lo abita ancora oggi.",
      'La "pietra di Luserna" si estrae in gran parte proprio nel territorio di Bagnolo, ma prende il nome dal paese vicino dove finivano i magazzini.',
    ],
    campanile: ["/campanili/004009.jpg"],
  },
  // Villanova Mondovì (004245) — Grotta dei Dossi, Santuario di Santa Lucia.
  // Sources: visitcuneese.it; sebastianus.org; viaggiapiccoli.com.
  "004245": {
    win: [
      "Villanova Mondovì, brau: sei sceso nella grotta più colorata d'Italia!",
      "Presa Villanova, luminoso come i Dossi illuminati per primi in Italia.",
      "Sviciu: hai trovato Villanova come i cacciatori trovarono la grotta.",
    ],
    miss: [
      "Madoi, ti perdi Villanova come la volpe che portò alla Grotta dei Dossi.",
      "Vitun, manco Santa Lucia sul Calvario ti ha aperto gli occhi!",
      "Òmmi òmmi, la grotta più colorata d'Italia e tu clicchi al buio.",
    ],
    fail: [
      "Ti arrendi su Villanova Mondovì: niente Grotta dei Dossi, resti all'asciutto.",
      "Salti Villanova: il santuario di Santa Lucia ti guarda dall'alto del Calvario.",
    ],
    facts: [
      "La Grotta dei Dossi, scoperta nel 1797, fu la prima grotta in Italia a essere illuminata elettricamente.",
      "Per i minerali disciolti nell'acqua è promossa come \"la grotta più colorata d'Italia\".",
      "Il Santuario di Santa Lucia, sul Monte Calvario, è meta di pellegrinaggio fin dal Cinquecento.",
    ],
    campanile: ["/campanili/004245.jpg"],
  },
  // Ceva (004066) — capitale del marchesato aleramico, Cebani, Mostra del Fungo.
  // Sources: Wikipedia IT; valtanarolife.com; mostradelfungo.it; comune di Ceva.
  "004066": {
    win: [
      "Ceva presa, brau: dritto nella capitale dei Cebani!",
      "Sviciu come un fungo cebano: Ceva beccata al primo colpo.",
      "Grande, hai preso Ceva: qui un tempo battevano pure moneta.",
    ],
    miss: [
      "Vitun, ti sfugge Ceva: manco un porcino la troveresti così male.",
      "Madoi, sbagli la capitale del marchesato: i Cebani si offendono!",
      "Òmmi òmmi, la Mostra del Fungo è qui, non dove hai cliccato.",
    ],
    fail: [
      "Ti arrendi su Ceva: niente funghi, niente marchesato, niente Val Tanaro.",
      "Salti Ceva, l'antica capitale dei Cebani sul Tanaro.",
    ],
    facts: [
      'Fu capitale di un marchesato aleramico e batteva una propria moneta, la "cebana".',
      "La Mostra Nazionale del Fungo si tiene dal 1962, ogni terza domenica di settembre.",
      "I suoi abitanti si chiamano Cebani, dall'antico nome del luogo, Ceba.",
    ],
    campanile: ["/campanili/004066.jpg"],
  },
  // Canale (004037) — capitale del Roero, Roero Arneis DOCG, pesche.
  // Sources: ecomuseodellerocche.it; welcomelangheroero.com; Consorzio Roero.
  "004037": {
    win: [
      "Canale beccata, brau: profumo di Arneis e di pesche!",
      "Sviciu come un bicchiere di Roero Arneis: Canale è tua.",
      "Grande, hai preso la capitale del Roero senza sbucciarti.",
    ],
    miss: [
      "Vitun, ti scappa Canale: qui l'Arneis lo fanno da secoli, la mira no.",
      "Madoi, sbagli Canale del pesco? Òmmi òmmi che raccolto magro.",
      "Blagor, parli di vini del Roero ma il paese non lo trovi.",
    ],
    fail: [
      "Salti Canale: niente Arneis, niente pesche, niente Roero.",
      "Ti arrendi sulla capitale del Roero: l'Arneis resta nel bicchiere altrui.",
    ],
    facts: [
      "A Canale ha sede il Consorzio di tutela del Roero e del Roero Arneis DOCG.",
      'Nel primo Novecento fu la "Canale del pesco": le pesche si esportavano oltre confine.',
      "Il paese fu fondato ex novo nel 1260 dagli astigiani.",
    ],
    campanile: ["/campanili/004037.jpg"],
  },
  // Peveragno (004163) — ai piedi della Bisalta, "paese delle fragole".
  // Sources: Wikipedia EN; visitcuneese.it; visitpiemonte.com; cuneocronaca.it.
  "004163": {
    win: [
      "Peveragno presa, brau: dolce come le sue fragole!",
      "Sviciu: hai beccato Peveragno all'ombra della Bisalta.",
      "Grande, dritto al paese delle fragole senza sbagliare cima.",
    ],
    miss: [
      "Vitun, ti sfugge Peveragno: manco la Bisalta con due cime te lo indica!",
      "Madoi, sbagli il paese delle fragole: che magra sagra.",
      "Òmmi òmmi, la Besimauda ti guarda dall'alto e tu clicchi storto.",
    ],
    fail: [
      "Ti arrendi su Peveragno: niente fragole, niente Bisalta.",
      "Salti Peveragno, adagiato ai piedi della Besimauda.",
    ],
    facts: [
      'Sorge ai piedi della Bisalta, in piemontese Besimauda: il nome vale "bis alta", perché ha due cime.',
      'È il "paese delle fragole": coltivate sopra i 500 metri, si festeggiano alla Sagra della Fragola di inizio giugno.',
    ],
    campanile: ["/campanili/004163.jpg"],
  },
  // Cavallermaggiore (004059) — Torre Civica e campanili medievali, "terra di libri".
  // Sources: Wikipedia EN; archeocarta.org; visitcuneese.it.
  "004059": {
    win: [
      "Cavallermaggiore beccata, brau: preciso come l'orologio della Torre Civica!",
      "Sviciu: hai preso Cavallermaggiore, torri e campanili compresi.",
      "Grande, dritto a Cavallermaggiore senza perderti tra le chiese.",
    ],
    miss: [
      "Vitun, sbagli con la Torre Civica alta quasi trenta metri a farti da faro!",
      "Madoi, ti perdi Cavallermaggiore tra i suoi campanili trecenteschi.",
      "Òmmi òmmi, tanti bei campanili e tu non ne azzecchi uno.",
    ],
    fail: [
      "Ti arrendi su Cavallermaggiore: niente Torre Civica, niente Pieve.",
      "Salti Cavallermaggiore, terra di torri, chiese e libri antichi.",
    ],
    facts: [
      "La Torre Civica fu costruita tra il 1564 e il 1581 e misura 28,60 metri.",
      "La chiesa di Santa Maria della Pieve conserva un campanile trecentesco gotico con guglia ottagonale e affreschi.",
      'Il nome "Cavallarius Maius" compare già in una bolla papale del 1185.',
    ],
    campanile: ["/campanili/004059.jpg"],
  },
  // Cervasca (004064) — Oltrestura, Madonna degli Alpini, castagne.
  // Sources: Wikipedia EN; comuni-italiani.it; piemontesacro.it; ghironda.com.
  "004064": {
    win: [
      "Cervasca presa, brau: dritto nell'Oltrestura!",
      "Sviciu: hai beccato Cervasca ai piedi delle Alpi.",
      "Grande, Cervasca è tua: la Madonna degli Alpini ti sorride.",
    ],
    miss: [
      "Vitun, ti sfugge Cervasca a due passi da Cuneo, madoi.",
      "Òmmi òmmi, sbagli Cervasca: manco il Monte San Giorgio ti orienta.",
      "Gadan, mettici più impegno: Cervasca era lì dietro l'angolo.",
    ],
    fail: [
      "Ti arrendi su Cervasca: niente castagne, niente Madonna degli Alpini.",
      "Salti Cervasca, comune dell'Oltrestura ai piedi delle Alpi.",
    ],
    facts: [
      "Sul Monte San Giorgio sorge il santuario della Madonna degli Alpini, belvedere sulla pianura cuneese.",
      "Il territorio, nell'Oltrestura ai piedi delle Alpi, è noto per castagne e frutti di bosco.",
    ],
    campanile: ["/campanili/004064.jpg"],
  },
};
