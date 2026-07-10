import type { MunicipalityFlavor } from "../../types";

/**
 * Tier 2a — mid-sized comuni of the Provincia di Cuneo (pop. ~3.3k–4.7k).
 * Dialect words are attested via cn.ts (brau, vitun, balengu, sviciu, madoi,
 * "òmmi òmmi", "oh basta là", blagor, gadan) — no invented grammar. Facts are
 * verified against ≥2 independent web sources; sources noted per comune.
 * Campanile/landmark photos are licensed from Wikimedia Commons (see CREDIT.md).
 */
export const cnTier2a: Record<string, MunicipalityFlavor> = {
  // Dogliani (004081) — Dolcetto di Dogliani DOCG; Luigi Einaudi (famiglia
  // doglianese, sepolto nel cimitero monumentale dello Schellino).
  // Sources: Wikipedia IT (Dogliani); langhe.net; doglianiturismo.com; Poderi
  // Luigi Einaudi; FAI (Cimitero monumentale di Dogliani).
  "004081": {
    win: [
      "Dogliani centrata, brau: un bicchiere di Dolcetto e via!",
      "Presa la patria del Dolcetto di Dogliani: sviciu come Einaudi al voto!",
    ],
    miss: [
      "Manchi Dogliani? E il Dolcetto DOCG chi lo stappa, balengu?",
      "Sbagli Dogliani? Luigi Einaudi si rigira nel cimitero dello Schellino, vitun.",
      "Òmmi òmmi, Dogliani era lì, in mezzo alle colline del Dolcetto.",
    ],
    fail: ["Ti arrendi su Dogliani? Niente Dolcetto DOCG per te."],
    facts: [
      "Il Dolcetto di Dogliani è tra i grandi rossi delle Langhe: la sua denominazione è diventata DOCG nel 2005.",
      "Luigi Einaudi, secondo Presidente della Repubblica, era di famiglia doglianese e riposa nel monumentale cimitero neogotico progettato da Giovanni Battista Schellino.",
    ],
    campanile: ["/campanili/004081.jpg"],
  },
  // Montà (004133) — Roero; Santuario dei Piloni (il più piccolo Sacro Monte
  // piemontese); Ecomuseo delle Rocche del Roero; sentieri e tartufo.
  // Sources: Wikipedia IT (Santuario dei Piloni); ecomuseodellerocche.it;
  // museodiffusocuneese.it; consorziodelroero.it.
  "004133": {
    win: [
      "Montà centrata, brau: cuore del Roero e delle Rocche!",
      "Presa Montà: profumo di tartufo bianco tra i sentieri del Roero.",
    ],
    miss: [
      "Manchi Montà? Ti perdi anche il Santuario dei Piloni, balengu.",
      "Sbagli Montà? I sentieri del Roero ti fanno girare a vuoto, vitun.",
      "Òmmi òmmi, Montà era lassù, in cima al Roero.",
    ],
    fail: [
      "Ti arrendi su Montà? Il più piccolo Sacro Monte del Piemonte resta senza di te.",
    ],
    facts: [
      "Il Santuario dei Piloni, nel bosco fuori Montà, è considerato il più piccolo Sacro Monte del Piemonte, con le sue cappelle della Via Crucis.",
      "Montà ospita la sede dell'Ecomuseo delle Rocche del Roero, con una rete di sentieri tematici tra le Rocche.",
    ],
    campanile: ["/campanili/004133.jpg"],
  },
  // Bernezzo (004022) — imbocco della Valle Grana; frazioni San Rocco e
  // Sant'Anna; tradizione della rivolta di Caraglio del 1198.
  // Sources: Wikipedia EN (Bernezzo); ghironda.com (Valle Grana);
  // distrettodiffusovallegrana.it.
  "004022": {
    win: [
      "Bernezzo centrata, brau: si entra in Valle Grana!",
      "Presa Bernezzo, tra San Rocco e Sant'Anna: sviciu!",
    ],
    miss: [
      "Manchi Bernezzo? La porta della Valle Grana ti sfugge, balengu.",
      "Sbagli Bernezzo? Òmmi òmmi, e sì che era all'imbocco della valle.",
    ],
    fail: [
      "Ti arrendi su Bernezzo? Peccato, la Valle Grana comincia proprio da qui.",
    ],
    facts: [
      "Bernezzo, all'imbocco della Valle Grana, si divide nelle frazioni di San Rocco e Sant'Anna.",
      "Secondo la tradizione, nel 1198 i bernezzesi parteciparono alla rivolta di Caraglio, all'origine della fondazione di Cuneo.",
    ],
  },
  // Revello (004180) — abbazia di Staffarda (sul territorio comunale);
  // residenza dei marchesi di Saluzzo; Monte Bracco; porta della Valle Po/Monviso.
  // Sources: Wikipedia IT (Abbazia di Santa Maria di Staffarda);
  // ordinemauriziano.it; comune.revello.cn.it; vallidelmonviso.it.
  "004180": {
    win: [
      "Revello centrata, brau: ai piedi del Monviso e del Monte Bracco!",
      "Presa Revello: qui l'abbazia di Staffarda veglia sulla pianura.",
    ],
    miss: [
      "Manchi Revello? L'abbazia di Staffarda ti guarda severa, balengu.",
      "Sbagli Revello? E il marchese di Saluzzo ci teneva pure casa, vitun.",
      "Òmmi òmmi, Revello era all'imbocco della Valle Po, sotto il Monviso.",
    ],
    fail: ["Ti arrendi su Revello? Niente Staffarda, niente Monviso per te."],
    facts: [
      "Sul territorio di Revello sorge l'abbazia cistercense di Santa Maria di Staffarda, fondata attorno al 1135 con una donazione del marchese Manfredo I di Saluzzo.",
      "Sotto Ludovico II e Margherita di Foix fu residenza prediletta dei marchesi di Saluzzo; è porta della Valle Po, dove il fiume nasce sotto il Monviso.",
    ],
    campanile: ["/campanili/004180.jpg"],
  },
  // Moretta (004143) — tradizione lattiero-casearia (burro); santuario della
  // Madonna del Pilone; castello dei Solari; titolo di città dal 2024.
  // Sources: Wikipedia IT (Moretta); comune.moretta.cn.it; visitcuneese.it.
  // NB: soprannome "gargota Eva" non verificabile da fonti indipendenti, omesso.
  "004143": {
    win: [
      "Moretta centrata, brau: qui il burro vince le esposizioni!",
      "Presa Moretta, la città del latte: sviciu!",
    ],
    miss: [
      "Manchi Moretta? Il castello dei Solari ti guarda dall'alto, balengu.",
      "Sbagli Moretta? E il santuario della Madonna del Pilone, vitun?",
      "Òmmi òmmi, Moretta ti è sfuggita per un soffio.",
    ],
    fail: [
      "Ti arrendi su Moretta? Peccato, città nuova di zecca e vecchia di storia.",
    ],
    facts: [
      "Moretta ha una lunga tradizione lattiero-casearia: il suo burro centrifugato conquistò premi a diverse esposizioni universali.",
      "Il santuario barocco della Madonna del Pilone fu edificato tra il 1685 e il 1691; Moretta ha ottenuto il titolo di città nel 2024.",
    ],
    campanile: ["/campanili/004143.jpg"],
  },
  // Santo Stefano Belbo (004213) — Cesare Pavese (casa natale, CEPAM);
  // Moscato d'Asti; colline delle Langhe e i "sorì".
  // Sources: Wikipedia IT (Cesare Pavese; Santo Stefano Belbo);
  // visitsantostefanobelbo.it; Touring Club (CEPAM).
  "004213": {
    win: [
      "Santo Stefano Belbo centrata, brau: la terra di Cesare Pavese!",
      "Presa Santo Stefano Belbo: un calice di Moscato per festeggiare!",
    ],
    miss: [
      "Manchi Santo Stefano Belbo? Pavese ti dedica una pagina amara, balengu.",
      "Sbagli il paese del Moscato? Òmmi òmmi, e le colline erano lì.",
      "Vitun, hai perso la casa natale di Pavese: che magra.",
    ],
    fail: [
      "Ti arrendi su Santo Stefano Belbo? Niente Moscato e niente 'La luna e i falò' per te.",
    ],
    facts: [
      "Cesare Pavese nacque a Santo Stefano Belbo il 9 settembre 1908: il paese e le sue colline sono lo sfondo de 'La luna e i falò'.",
      "È nel cuore della zona del Moscato d'Asti, con i suoi ripidi 'sorì' vitati esposti al sole.",
    ],
    campanile: ["/campanili/004213.jpg"],
  },
  // Manta (004116) — Castello della Manta (FAI); affreschi tardogotici della
  // Sala Baronale (Maestro della Manta, ~1420); Nove Prodi, Fontana della Giovinezza.
  // Sources: FAI (Castello della Manta); Wikipedia EN (Castello della Manta);
  // turismo.it; castelliaperti.it.
  "004116": {
    win: [
      "Manta centrata, brau: su al castello degli affreschi!",
      "Presa la Manta: i Nove Prodi ti fanno il baciamano dalla Sala Baronale.",
    ],
    miss: [
      "Manchi Manta? Il Maestro degli affreschi ti guarda storto, balengu.",
      "Sbagli Manta? La Fontana della Giovinezza non ti ringiovanisce, vitun.",
      "Òmmi òmmi, il castello della Manta era proprio lì sopra Saluzzo.",
    ],
    fail: ["Ti arrendi su Manta? Niente affreschi tardogotici del FAI per te."],
    facts: [
      "La Sala Baronale del Castello della Manta conserva un celebre ciclo di affreschi tardogotici, dipinto attorno al 1420 dall'anonimo 'Maestro della Manta', con i Nove Prodi, le Nove Eroine e la Fontana della Giovinezza.",
      "Il castello è gestito dal FAI dal 1985, dopo la donazione della contessa Elisabetta De Rege Provana.",
    ],
    campanile: ["/campanili/004116.jpg"],
  },
  // Bene Vagienna (004019) — Augusta Bagiennorum, città romana dei Bagienni;
  // scavi Assandria & Vacchetta; riserva naturale; Bandiera Arancione.
  // Sources: Wikipedia EN (Augusta Bagiennorum); archeocarta.org;
  // museodiffusocuneese.it; Touring Club (Bandiere Arancioni).
  "004019": {
    win: [
      "Bene Vagienna centrata, brau: benvenuto ad Augusta Bagiennorum!",
      "Presa Bene Vagienna: qui i Bagienni facevano città romana.",
    ],
    miss: [
      "Manchi Bene Vagienna? Il teatro romano ti fischia, balengu.",
      "Sbagli l'antica Augusta Bagiennorum? Òmmi òmmi, duemila anni buttati.",
      "Vitun, hai perso la città dei Bagienni per un click.",
    ],
    fail: [
      "Ti arrendi su Bene Vagienna? L'anfiteatro romano resta senza pubblico.",
    ],
    facts: [
      "Poco fuori Bene Vagienna sorgeva Augusta Bagiennorum, città romana dei Bagienni, con anfiteatro, teatro, foro e acquedotto.",
      "I resti furono riportati alla luce dagli studiosi locali Giuseppe Assandria e Giovanni Vacchetta a cavallo tra Otto e Novecento; oggi l'area è riserva naturale.",
    ],
    campanile: ["/campanili/004019.jpg"],
  },
  // Diano d'Alba (004080) — Dolcetto di Diano d'Alba DOCG e i suoi "sorì";
  // panorama-balcone sulle Langhe; castello anti-saraceno.
  // Sources: Wikipedia IT (Diano d'Alba); soridiano.it; winepassitaly.it;
  // patrimoniodaraccontare.it.
  "004080": {
    win: [
      "Diano d'Alba centrata, brau: che balcone sulle Langhe!",
      "Presa Diano d'Alba: un Dolcetto dei sorì per brindare!",
    ],
    miss: [
      "Manchi Diano d'Alba? Da lassù si vedeva tutto, balengu.",
      "Sbagli Diano? E i settantasei sorì del Dolcetto, vitun?",
      "Òmmi òmmi, Diano d'Alba era il balcone più bello delle Langhe.",
    ],
    fail: [
      "Ti arrendi su Diano d'Alba? Niente panorama e niente Dolcetto dei sorì.",
    ],
    facts: [
      "Il Dolcetto di Diano d'Alba, DOCG dal 2010, è tra i primi vini italiani a valorizzare i cru di singola vigna, i 'sorì' (i versanti più assolati).",
      "Dai 500 metri del paese lo sguardo abbraccia le colline del Moscato, del Barbaresco e del Barolo: un vero balcone sulle Langhe.",
    ],
    campanile: ["/campanili/004080.jpg"],
  },
  // Chiusa di Pesio (004068) — imbocco della Valle Pesio; Certosa di Santa
  // Maria (certosini, 1173); poi stabilimento idroterapico e Consolata.
  // Sources: Wikipedia EN (Certosa di Pesio); it.cathopedia.org;
  // piemontesacro.it; parchialpicozie.it.
  "004068": {
    win: [
      "Chiusa di Pesio centrata, brau: su per la Valle Pesio!",
      "Presa Chiusa di Pesio: silenzio da certosini!",
    ],
    miss: [
      "Manchi Chiusa di Pesio? La Certosa ti impone il silenzio, balengu.",
      "Sbagli l'imbocco della Valle Pesio? Òmmi òmmi, era proprio lì.",
    ],
    fail: [
      "Ti arrendi su Chiusa di Pesio? La Certosa di Santa Maria resta in pace senza di te.",
    ],
    facts: [
      "In alta Valle Pesio sorge la Certosa di Santa Maria, fondata nel 1173 dai monaci certosini su terre donate dai signori di Morozzo.",
      "Soppressa in epoca napoleonica e trasformata in stabilimento idroterapico nell'Ottocento, dal 1934 è affidata ai Missionari della Consolata.",
    ],
  },
  // Guarene (004101) — Castello di Guarene (Carlo Giacinto Roero, 1726);
  // Roero e "balcone" sulle Alpi; culla della pera Madernassa.
  // Sources: Wikipedia IT (Guarene); castellodiguarene.com; guarene.it;
  // langhe.net (Pera Madernassa).
  "004101": {
    win: [
      "Guarene centrata, brau: il balcone del Roero sulle Alpi!",
      "Presa Guarene: il castello dei Roero ti apre le porte.",
    ],
    miss: [
      "Manchi Guarene? Il castello settecentesco dei Roero ti guarda dall'alto, balengu.",
      "Sbagli Guarene? E la pera Madernassa nasce proprio qui, vitun.",
      "Òmmi òmmi, Guarene era lassù, affacciata sul Tanaro.",
    ],
    fail: [
      "Ti arrendi su Guarene? Niente castello e niente pere Madernassa per te.",
    ],
    facts: [
      "Il Castello di Guarene fu costruito dal 1726 come residenza estiva del conte Carlo Giacinto Roero, che ne firmò il progetto; oggi è un raffinato albergo.",
      "La pera Madernassa ha origine nel Roero tra Guarene e Vezza, da una pianta nata a fine Settecento alla Cascina Gavello, nella borgata Madernassa.",
    ],
    campanile: ["/campanili/004101.jpg"],
  },
  // Beinette (004016) — pianura ai piedi della Bisalta; patroni San Giacomo e
  // San Cristoforo; storico mercato del mercoledì.
  // Sources: Wikipedia EN (Beinette); italiapedia.it; turismocn.com.
  "004016": {
    win: [
      "Beinette centrata, brau: ai piedi della Bisalta!",
      "Presa Beinette: sviciu, mercoledì è giorno di mercato!",
    ],
    miss: [
      "Manchi Beinette? La Bisalta lì dietro ti guarda male, balengu.",
      "Sbagli Beinette? Òmmi òmmi, e il mercato del mercoledì ti aspettava.",
    ],
    fail: [
      "Ti arrendi su Beinette? Peccato, un paese tranquillo sotto la Bisalta.",
    ],
    facts: [
      "Beinette si stende nella pianura ai piedi della Bisalta, la montagna simbolo del Cuneese.",
      "I patroni sono San Giacomo e San Cristoforo, festeggiati il 25 luglio; storico l'appuntamento del mercato del mercoledì.",
    ],
  },
  // Narzole (004147) — patria della cugnà; viticoltura di Langa; comune
  // autonomo dal 1802 per decreto di Napoleone; Fiera Napoleonica.
  // Sources: welcomelangheroero.com; movingitalia.it; comune.narzole.cn.it;
  // gitefuoriportainpiemonte.it (Fiera Napoleonica).
  "004147": {
    win: [
      "Narzole centrata, brau: patria della cugnà!",
      "Presa Narzole: sviciu, con un cucchiaio di cugnà per il bollito!",
    ],
    miss: [
      "Manchi Narzole? Senza cugnà il bollito piange, balengu.",
      "Sbagli Narzole? Òmmi òmmi, e Napoleone l'aveva pure resa comune.",
    ],
    fail: ["Ti arrendi su Narzole? Niente cugnà sulla toma per te."],
    facts: [
      "Narzole è celebre per la cugnà, la salsa dolce di mosto d'uva con nocciole, mele cotogne, pere e fichi che accompagna bolliti e formaggi.",
      "A lungo dipendente da Cherasco, Narzole divenne comune autonomo nel 1802 per decreto di Napoleone; ancora oggi celebra la Fiera Napoleonica.",
    ],
  },
  // Pocapaglia (004170) — Roero e le Rocche; la fiaba di Calvino sulle galline
  // col sacchetto; la leggenda della masca Micilina.
  // Sources: ecomuseodellerocche.it; consorziodelroero.it (masca Micilina);
  // portalanghe.com; Italo Calvino, "Fiabe italiane" (La barba del conte).
  "004170": {
    win: [
      "Pocapaglia centrata, brau: in bilico sulle Rocche del Roero!",
      "Presa Pocapaglia: sviciu, più delle galline col sacchetto!",
    ],
    miss: [
      "Manchi Pocapaglia? Le galline col sacchetto ridono di te, balengu.",
      "Sbagli Pocapaglia? La masca Micilina ti fa una fattura, vitun.",
      "Òmmi òmmi, Pocapaglia era là, aggrappata alle Rocche.",
    ],
    fail: [
      "Ti arrendi su Pocapaglia? Le uova rotolano giù dalle Rocche senza di te.",
    ],
    facts: [
      "Italo Calvino aprì una delle sue Fiabe italiane ('La barba del conte') descrivendo Pocapaglia così ripida che gli abitanti legavano un sacchetto sotto le galline per non far rotolare via le uova.",
      "Sulle Rocche di Pocapaglia si ambienta la leggenda della masca Micilina; una donna del posto fu processata e messa al rogo per stregoneria nel 1544.",
    ],
  },
};
