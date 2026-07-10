import type { MunicipalityFlavor } from "../../types";

/**
 * Tier 2b — mid-sized comuni of the Provincia di Cuneo (Provincia Granda),
 * pop. ~2.6k–3.3k. Dialect words are attested via cn.ts (brau, vitun, balengu,
 * sviciu, madoi, "òmmi òmmi", "oh basta là", blagor, gadan, badòla, tüpin) —
 * no invented grammar; light Occitan/piemontese touches in the Occitan valleys
 * (Varaita, Vermenagna, alta Val Po). Facts are verified against ≥2 independent
 * web sources; sources noted per comune. Campanile/landmark photos are licensed
 * from Wikimedia Commons (see CREDIT.md).
 */
export const cnTier2b: Record<string, MunicipalityFlavor> = {
  // Neive (004148) — "I Borghi più belli d'Italia", torre dell'orologio medievale,
  // uno dei quattro comuni del Barbaresco DOCG, "Bottega dei quattro vini".
  // Sources: e-borghi.com; guidatorino.com; bottegadei4vini.com; langhe.net.
  "004148": {
    win: [
      "Neive centrata, brau: uno dei borghi più belli d'Italia!",
      "Presa la perla del Barbaresco, sviciu: che profumo di Nebbiolo!",
    ],
    miss: [
      "Manchi Neive? E il Barbaresco chi se lo beve, balengu?",
      "Vitun, hai perso uno dei borghi più belli d'Italia: che magra.",
      "Òmmi òmmi, la torre dell'orologio ti guarda male da lassù.",
    ],
    fail: ["Ti arrendi su Neive? Niente brindisi coi quattro vini, allora."],
    facts: [
      "Neive è tra 'I Borghi più belli d'Italia' e uno dei quattro comuni in cui si produce il Barbaresco DOCG, con Barbaresco, Treiso e una parte di Alba.",
      "La 'Bottega dei quattro vini' celebra i vitigni del paese: Dolcetto, Barbera, Barbaresco e Moscato.",
    ],
  },
  // Costigliole Saluzzo (004075) — i tre castelli all'imbocco della Valle Varaita,
  // affreschi di Hans Clemer nella cripta della parrocchiale. Sources: Wikipedia
  // EN (Costigliole Saluzzo); visitcuneese.it; vallidelmonviso.it.
  "004075": {
    win: [
      "Costigliole Saluzzo presa, brau: tre castelli in un colpo solo!",
      "Centrata la porta della Valle Varaita: sviciu e preciso!",
    ],
    miss: [
      "Manchi Costigliole? Con tre castelli che ti guardano, vitun!",
      "Sbagli l'imbocco della Varaita? I signori Costanzia si offendono, balengu.",
      "Òmmi òmmi, tre castelli e non ne becchi manco uno.",
    ],
    fail: [
      "Ti arrendi su Costigliole Saluzzo? Il Castello Rosso resta senza visita.",
    ],
    facts: [
      "Tre castelli dominano il paese all'imbocco della Valle Varaita: il Castello Rosso, il Castellotto e il Castello Reynaudi.",
      "Nella cripta alla base del campanile della parrocchiale di Santa Maria Maddalena si conservano affreschi attribuiti a Hans Clemer, il 'Maestro d'Elva'.",
    ],
  },
  // Marene (004117) — castello neogotico dei conti Gallina, zona storica del
  // cappone di Racconigi, pianura saviglianese. Sources: comune.marene.cn.it;
  // Wikipedia EN (Marene); targatocn.it (cappone di Racconigi PAT).
  "004117": {
    win: [
      "Marene centrata, brau: dritto nella pianura granda!",
      "Presa Marene: preciso come una fila di pioppi saviglianesi.",
    ],
    miss: [
      "Manchi Marene? Il castello dei Gallina ti guarda storto, balengu.",
      "Vitun, Marene era lì nella pianura, liscia liscia: come fai a mancarla?",
      "Òmmi òmmi, persa Marene per un soffio.",
    ],
    fail: [
      "Ti arrendi su Marene? Peccato, il castello neogotico dei Gallina valeva un click.",
    ],
    facts: [
      "Il centro di Marene è dominato dal castello neogotico dei conti Gallina.",
      "Rientra tra i comuni di allevamento storico del cappone di Racconigi, prodotto tradizionale della pianura cuneese.",
    ],
  },
  // Vicoforte (004242) — Santuario di Vicoforte, la più grande cupola ellittica
  // del mondo; dal 2017 tombe reali di Vittorio Emanuele III ed Elena. Sources:
  // Wikipedia IT (Santuario di Vicoforte); comune.vicoforte.cn.it; ilsole24ore.com.
  "004242": {
    win: [
      "Vicoforte centrata, brau: sotto la cupola ellittica più grande del mondo!",
      "Presa Vicoforte: preciso come l'ellisse del Santuario!",
    ],
    miss: [
      "Manchi Vicoforte? La cupola più grande del mondo e non la vedi, balengu?",
      "Vitun, hai perso il Santuario: madoi, era grande come una montagna!",
      "Òmmi òmmi, sotto quella cupola riposa persino un re, e tu la sbagli.",
    ],
    fail: [
      "Ti arrendi su Vicoforte? Niente salita alla cupola ellittica per te.",
    ],
    facts: [
      "Il Santuario di Vicoforte ha la più grande cupola ellittica del mondo: l'ellisse misura circa 37 per 25 metri e l'altezza sfiora gli 84 metri.",
      "Dal 2017 vi riposano le salme del re Vittorio Emanuele III e della regina Elena, nella cappella di San Bernardo.",
    ],
  },
  // Caramagna Piemonte (004041) — abbazia di Santa Maria fondata nel 1028 da
  // Olderico Manfredi e Berta. Sources: Wikipedia EN (Caramagna Piemonte);
  // alberogrande.it (Abbazia S. Maria di Caramagna); comune.caramagnapiemonte.cn.it.
  "004041": {
    win: [
      "Caramagna Piemonte presa, brau: mille anni di storia in un click!",
      "Centrata Caramagna: sviciu, dritto all'abbazia dei marchesi di Torino.",
    ],
    miss: [
      "Manchi Caramagna? L'abbazia di Santa Maria è lì dal 1028, balengu.",
      "Vitun, hai perso Caramagna: madoi, e sì che era vicino a Torino.",
      "Òmmi òmmi, persa Caramagna nella pianura del Roero.",
    ],
    fail: [
      "Ti arrendi su Caramagna? L'antica abbazia resta senza il tuo click.",
    ],
    facts: [
      "L'abbazia di Santa Maria fu fondata nel 1028 per volontà del marchese di Torino Olderico Manfredi e della moglie Berta.",
      "Il nome di Caramagna compare per la prima volta in un documento del 1026.",
    ],
  },
  // Sanfrè (004208) — castello degli Isnardi, dolce tipico "fuaset". Sources:
  // langhe.net; welcomelangheroero.com; dimorestoricheitaliane.it.
  "004208": {
    win: [
      "Sanfrè centrata, brau: il castello degli Isnardi ti fa il baciamano!",
      "Presa Sanfrè, ai margini del Roero: sviciu che non sei altro.",
    ],
    miss: [
      "Manchi Sanfrè? Il castello degli Isnardi ti guarda dall'alto, vitun.",
      "Sbagli Sanfrè? E il 'fuaset' te lo scordi, gadan.",
      "Òmmi òmmi, Sanfrè era proprio lì al bordo del Roero.",
    ],
    fail: ["Ti arrendi su Sanfrè? Niente fetta di fuaset per te."],
    facts: [
      "Il paese è dominato dal castello degli Isnardi, famiglia di banchieri astigiani, ricostruito tra il XIV e il XVIII secolo dopo un incendio.",
      "Dolce tipico è il 'fuaset', pane dolce arricchito di limone, burro e uova, legato alla tradizione quaresimale.",
    ],
  },
  // Garessio (004095) — "I Borghi più belli d'Italia", acqua San Bernardo, quattro
  // borghi lungo il Tanaro, "perla delle Alpi Marittime". Photo: campanile della
  // chiesa vecchia di Santa Maria Extra Moenia (monumento nazionale). Sources:
  // e-borghi.com; borghistorici.it; beverfood.com.
  "004095": {
    win: [
      "Garessio centrata, brau: perla delle Alpi Marittime!",
      "Presa Garessio, tra i borghi più belli d'Italia: sviciu e fresco come l'acqua San Bernardo!",
    ],
    miss: [
      "Manchi Garessio? E l'acqua San Bernardo chi te la versa, balengu?",
      "Vitun, hai perso uno dei borghi più belli d'Italia sul Tanaro.",
      "Òmmi òmmi, quattro borghi e non ne trovi manco uno.",
    ],
    fail: [
      "Ti arrendi su Garessio? Niente sorso alle sorgenti di San Bernardo.",
    ],
    facts: [
      "L'acqua minerale San Bernardo sgorga dalle sorgenti sopra Garessio e ha reso il paese una rinomata località di villeggiatura.",
      "Garessio è tra 'I Borghi più belli d'Italia' e si distende in quattro borghi storici lungo il Tanaro: Borgo Maggiore, Borgo Ponte, Borgo Poggiolo e Borgo Valsorda.",
    ],
  },
  // Villafalletto (004244) — feudo dei Falletti dal 1332, ricetto medievale sul
  // Maira, paese natale di Bartolomeo Vanzetti. Sources: comune.villafalletto.cn.it;
  // visitcuneese.it (Villafalletto, il paese di Vanzetti); sentierosulmaira.it.
  "004244": {
    win: [
      "Villafalletto centrata, brau: mezzo millennio di Falletti in un click!",
      "Presa Villafalletto, sul Maira: preciso come il vecchio ricetto.",
    ],
    miss: [
      "Manchi Villafalletto? I Falletti la tennero cinque secoli, e tu la perdi, balengu.",
      "Vitun, hai sbagliato il paese di Vanzetti: madoi, che sbadataggine.",
      "Òmmi òmmi, Villafalletto era proprio lì sulla riva del Maira.",
    ],
    fail: [
      "Ti arrendi su Villafalletto? Il ricetto medievale resta senza di te.",
    ],
    facts: [
      "Nel 1332 il paese passò alla famiglia Falletti, che lo tenne per quasi mezzo millennio.",
      "Qui nel 1888 nacque Bartolomeo Vanzetti, del celebre caso giudiziario statunitense 'Sacco e Vanzetti'.",
    ],
  },
  // Santa Vittoria d'Alba (004212) — torre campanaria romanica, frazione Cinzano
  // (vermouth), panorama su Roero e Langhe. Photo: parrocchiale Maria Vergine
  // Assunta. Sources: ecomuseodellerocche.it; welcomelangheroero.com;
  // consorziodelroero.it.
  "004212": {
    win: [
      "Santa Vittoria d'Alba presa, brau: un brindisi al vermouth Cinzano!",
      "Centrata la collina sul Tanaro: che panorama su Roero e Langhe!",
    ],
    miss: [
      "Manchi Santa Vittoria? E il Cinzano chi lo versa, blagor?",
      "Vitun, hai perso la collina del vermouth: òmmi òmmi.",
      "Sbagli Santa Vittoria d'Alba? La torre lassù ti guarda deluso.",
    ],
    fail: [
      "Ti arrendi su Santa Vittoria d'Alba? Niente aperitivo con vista sul Roero.",
    ],
    facts: [
      "La frazione Cinzano prende il nome dalla storica casa vinicola torinese Francesco Cinzano & C., che qui ebbe a lungo il suo stabilimento del vermouth.",
      "Il borgo alto è dominato da una torre campanaria a base quadrata, alta una ventina di metri e di forme romaniche.",
    ],
  },
  // Piasco (004166) — Museo dell'Arpa Victor Salvi, imbocco della Valle Varaita.
  // Sources: museodellarpavictorsalvi.it; cultura.gov.it; vallevaraita.com.
  "004166": {
    win: [
      "Piasco centrata, brau: dolce come un'arpa Salvi!",
      "Presa Piasco, alla porta della Valle Varaita: sviste da manuale, sviciu!",
    ],
    miss: [
      "Manchi Piasco? E il museo dell'arpa chi lo suona, balengu?",
      "Vitun, hai perso Piasco: madoi, e sì che era all'imbocco della Varaita.",
      "Òmmi òmmi, persa Piasco: l'arpa suona in tono, tu no.",
    ],
    fail: ["Ti arrendi su Piasco? Niente giro tra le arpe di Victor Salvi."],
    facts: [
      "A Piasco ha sede il Museo dell'Arpa Victor Salvi, l'unico museo al mondo interamente dedicato all'arpa.",
      "Nel 1974 Victor Salvi trasferì qui la sua fabbrica di arpe, in una ex filanda, sfruttando l'antica tradizione dei maestri del legno del Saluzzese.",
    ],
  },
  // La Morra (004105) — Barolo, belvedere sulle Langhe, Cappella del Barolo di
  // Sol LeWitt e David Tremlett. Photo: chiesa di San Martino. Sources: Wikipedia
  // IT (Cappella del Barolo); ceretto.com; lamorraturismo.it.
  "004105": {
    win: [
      "La Morra centrata, brau: dal belvedere si vedono tutte le Langhe!",
      "Presa la capitale del Barolo: sviciu, e brindiamo!",
    ],
    miss: [
      "Manchi La Morra? E il Barolo dal belvedere chi lo ammira, balengu?",
      "Vitun, hai perso la cappella coloratissima di LeWitt e Tremlett.",
      "Òmmi òmmi, La Morra era lassù, la più alta delle Langhe.",
    ],
    fail: ["Ti arrendi su La Morra? Niente panorama sui vigneti del Barolo."],
    facts: [
      "Dal belvedere di La Morra si gode uno dei panorami più celebri sulle Langhe del Barolo.",
      "La Cappella del Barolo (o delle Brunate), un fienile del 1914, fu reinterpretata nel 1999 dagli artisti Sol LeWitt e David Tremlett con colori vivaci.",
    ],
  },
  // Sommariva Perno (004223) — "paese delle fragole", castello residenza di caccia
  // di Vittorio Emanuele II e della "Bela Rosin". Sources: welcomelangheroero.com;
  // ecomuseodellerocche.it; comune.sommarivaperno.cn.it.
  "004223": {
    win: [
      "Sommariva Perno centrata, brau: dolce come una fragola del Roero!",
      "Presa Sommariva Perno: sviciu, e il re ci veniva a caccia!",
    ],
    miss: [
      "Manchi Sommariva Perno? E le fragole chi le raccoglie, balengu?",
      "Vitun, hai perso il paese delle fragole: madoi, che magra.",
      "Òmmi òmmi, persa Sommariva Perno tra le rocche del Roero.",
    ],
    fail: ["Ti arrendi su Sommariva Perno? Niente cesto di fragole per te."],
    facts: [
      "È detta 'il paese delle fragole': la coltivazione iniziò nei primi del Novecento e dal 1954 si celebra la Sagra delle Fragole.",
      "Il castello di origine medievale fu residenza di caccia di Vittorio Emanuele II e della sua 'Bela Rosin', Rosa Vercellana contessa di Mirafiori.",
    ],
  },
  // Roccavione (004192) — confluenza Vermenagna/Gesso, valli occitane, rifugio
  // dei Catari. Sources: Wikipedia IT (Roccavione); vermenagna-roya.eu;
  // visitcuneese.it.
  "004192": {
    win: [
      "Roccavione centrata, brau: benvenuti nelle valli occitane!",
      "Presa Roccavione, tra Vermenagna e Gesso: sviciu, bèn!",
    ],
    miss: [
      "Manchi Roccavione? All'imbocco delle valli occitane, vitun!",
      "Sbagli Roccavione? Madoi, era proprio dove Vermenagna e Gesso si danno la mano.",
      "Òmmi òmmi, persa Roccavione: la lenga d'òc si offende.",
    ],
    fail: [
      "Ti arrendi su Roccavione? La porta delle valli occitane resta chiusa.",
    ],
    facts: [
      "Roccavione sorge alla confluenza tra la Valle Vermenagna e la Valle Gesso, all'ingresso delle valli occitane cuneesi.",
      "Dal Duecento la bassa valle accolse gruppi di Catari in fuga dalla Francia meridionale, favorendo la diffusione della lingua occitana.",
    ],
  },
  // Paesana (004157) — alta Val Po ai piedi del Monviso, due borghi (Santa Maria
  // e Santa Margherita), campanile romanico. Sources: paesana.it; Wikipedia EN
  // (Paesana); vallidelmonviso.it.
  "004157": {
    win: [
      "Paesana centrata, brau: dritto ai piedi del Monviso!",
      "Presa Paesana, all'imbocco dell'alta Val Po: sviciu e su di quota!",
    ],
    miss: [
      "Manchi Paesana? Col Monviso lì sopra che ti fa da segnale, balengu!",
      "Vitun, hai perso Paesana: madoi, e il Po nasce proprio lassù.",
      "Òmmi òmmi, persa Paesana tra le sue due parrocchie.",
    ],
    fail: ["Ti arrendi su Paesana? Il Monviso lassù ti guarda deluso."],
    facts: [
      "Paesana si distende ai piedi del Monviso, in due borghi sulle rive del Po dedicati alle parrocchie di Santa Maria e Santa Margherita.",
      "La parrocchiale di Santa Maria conserva un pregevole campanile romanico.",
    ],
  },
  // Vignolo (004243) — castrum Vignolii citato nel diploma di Barbarossa (1159),
  // santuario di San Maurizio (Madonna degli Alpini). Sources: Wikipedia EN
  // (Vignolo); santuariosanmaurizio.it; comuni-italiani.it.
  "004243": {
    win: [
      "Vignolo centrata, brau: un castrum vecchio di secoli!",
      "Presa Vignolo, a due passi da Cuneo: sviciu che non sei altro.",
    ],
    miss: [
      "Manchi Vignolo? Era a un tiro di schioppo da Cuneo, balengu.",
      "Vitun, hai perso Vignolo: madoi, così vicino al capoluogo.",
      "Òmmi òmmi, persa Vignolo all'imbocco della valle.",
    ],
    fail: [
      "Ti arrendi su Vignolo? Il santuario di San Maurizio resta senza il tuo saluto.",
    ],
    facts: [
      "Il 'castrum Vignolii' è citato nel diploma dell'imperatore Federico Barbarossa del 1159.",
      "Il santuario di San Maurizio, sopra il paese, è dal 1938 dedicato anche alla Madonna degli Alpini.",
    ],
  },
};
