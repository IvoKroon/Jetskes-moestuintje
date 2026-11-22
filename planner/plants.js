// Groenten, fruit en kruiden voor de moestuinplanner.
// Elke plant heeft een 8x8 pixelart-sprite (tekstraster, zie PALET) en verzorgingsinfo.
// Maanden zijn 1..12. z = zaaien/planten, o = oogsten.

export const PALET = {
  g: '#63c74d', // groen
  G: '#3e8948', // donkergroen
  l: '#a6e86b', // lichtgroen
  r: '#e43b44', // rood
  R: '#a22633', // donkerrood
  o: '#f77622', // oranje
  O: '#c4501a', // donkeroranje
  y: '#fee761', // geel
  Y: '#e5b236', // donkergeel
  b: '#8f563b', // bruin
  c: '#e8c28e', // aardappelkleur
  w: '#fff6d9', // wit/papier
  P: '#f5a3b8', // roze
  p: '#8a4fb5', // paars
  B: '#3f6fd1', // blauw
  k: '#2b1d14', // inkt
};

export const PLANTEN = [
  {
    id: 'tomaat', naam: 'Tomaat', soort: 'groente',
    sprite: ['...gg...', '..gGgg..', '.rrgrrr.', 'rrrrrrrr', 'rrwrrrrr', 'rrrrrrrR', '.rrrrrR.', '..RRRR..'],
    z: [3, 4, 5], o: [7, 8, 9, 10],
    zaaien: 'Binnen zaaien in maart of april. Na half mei (IJsheiligen) naar buiten.',
    water: 'Veel en regelmatig, aan de voet. Niet over de blaadjes.',
    zon: 'Volle zon, liefst beschut.',
    afstand: '50 cm',
    tip: 'Knijp de dieven (zijscheutjes in de oksels) weg en bind de plant aan een stok.',
    goed: ['basilicum', 'wortel', 'peterselie', 'ui'],
    slecht: ['aardappel', 'mais'],
  },
  {
    id: 'sla', naam: 'Sla', soort: 'groente',
    sprite: ['..l..l..', '.lgllgl.', 'lgllllgl', 'lllgglll', 'glgllglg', 'gglggglg', '.gGggGg.', '..GGGG..'],
    z: [3, 4, 5, 6, 7, 8], o: [5, 6, 7, 8, 9, 10],
    zaaien: 'Van maart tot augustus. Zaai elke 2 à 3 weken een beetje, dan heb je steeds verse sla.',
    water: 'Regelmatig, de grond mag niet uitdrogen.',
    zon: 'Zon of halfschaduw. Bij hitte liever wat schaduw.',
    afstand: '25 cm',
    tip: 'Bij warm weer schiet sla door (gaat bloeien). Oogst dus op tijd.',
    goed: ['wortel', 'radijs', 'aardbei', 'ui'],
    slecht: ['peterselie'],
  },
  {
    id: 'wortel', naam: 'Wortel', soort: 'groente',
    sprite: ['..g.g...', '...gg.g.', '...ggg..', '..oooo..', '..oobo..', '...ooo..', '...oo...', '....o...'],
    z: [3, 4, 5, 6, 7], o: [6, 7, 8, 9, 10, 11],
    zaaien: 'Direct in de grond, van maart tot juli, in rijtjes.',
    water: 'Matig, wel gelijkmatig vochtig houden.',
    zon: 'Zon.',
    afstand: '5 cm in de rij, 25 cm tussen de rijen',
    tip: 'Dun de plantjes uit als ze klein zijn. Uien ernaast houden de wortelvlieg weg.',
    goed: ['ui', 'prei', 'sla', 'tomaat', 'radijs', 'erwt'],
    slecht: [],
  },
  {
    id: 'aardbei', naam: 'Aardbei', soort: 'fruit',
    sprite: ['..gggg..', '.gGggGg.', '.rrrrrr.', 'rryrryrr', 'rrrrrrrr', '.ryrrry.', '..rrrr..', '...rr...'],
    z: [3, 4, 8, 9], o: [6, 7],
    zaaien: 'Plantjes zetten in augustus/september of in het voorjaar.',
    water: 'Veel water als de vruchten groeien.',
    zon: 'Volle zon, dan worden ze het zoetst.',
    afstand: '30 cm',
    tip: 'Leg stro onder de vruchten zodat ze schoon en droog blijven. Knip uitlopers weg.',
    goed: ['sla', 'spinazie', 'ui', 'prei'],
    slecht: [],
  },
  {
    id: 'courgette', naam: 'Courgette', soort: 'groente',
    sprite: ['......gG', '.....ggG', '....gggG', '...gglg.', '..gglg..', '.gglg...', 'gGgg....', 'GG......'],
    z: [4, 5], o: [7, 8, 9, 10],
    zaaien: 'Binnen zaaien in april, half mei naar buiten.',
    water: 'Veel, vooral als het warm is.',
    zon: 'Volle zon.',
    afstand: '100 cm (hij wordt groot!)',
    tip: 'Oogst ze klein (15 à 20 cm), dan smaken ze lekkerder en komen er meer.',
    goed: ['mais', 'boon'],
    slecht: ['aardappel'],
  },
  {
    id: 'boon', naam: 'Sperzieboon', soort: 'groente',
    sprite: ['...gG...', '...gg...', '....gl..', '....gl..', '...gl...', '...gl...', '..gl....', '..g.....'],
    z: [5, 6, 7], o: [7, 8, 9],
    zaaien: 'Direct buiten vanaf half mei, als de grond warm is.',
    water: 'Regelmatig, vooral tijdens de bloei.',
    zon: 'Zon.',
    afstand: '10 cm',
    tip: 'Hoe vaker je plukt, hoe meer bonen er komen.',
    goed: ['mais', 'wortel', 'courgette', 'aardappel', 'pompoen', 'komkommer'],
    slecht: ['ui', 'prei'],
  },
  {
    id: 'erwt', naam: 'Doperwt', soort: 'groente',
    sprite: ['........', 'G.......', '.gggggg.', 'glglglgg', 'gglglglg', '.gggggg.', '........', '........'],
    z: [3, 4, 5], o: [6, 7],
    zaaien: 'Direct buiten van maart tot mei.',
    water: 'Matig.',
    zon: 'Zon.',
    afstand: '5 cm',
    tip: 'Zet er rijshout of gaas bij, dan kunnen ze omhoog klimmen.',
    goed: ['wortel', 'radijs', 'sla', 'mais', 'komkommer'],
    slecht: ['ui', 'prei'],
  },
  {
    id: 'radijs', naam: 'Radijs', soort: 'groente',
    sprite: ['..g..g..', '...gg...', '...gg...', '..PrrP..', '.rrrrrr.', '.rwrrrr.', '..rrrr..', '...ww...'],
    z: [3, 4, 5, 6, 7, 8, 9], o: [4, 5, 6, 7, 8, 9, 10],
    zaaien: 'Van maart tot september, direct buiten. Binnen 4 weken klaar!',
    water: 'Regelmatig. Te droog maakt ze scherp en voos.',
    zon: 'Zon of halfschaduw.',
    afstand: '3 cm',
    tip: 'De snelste groente die er is. Leuk als tussenvulling tussen tragere planten.',
    goed: ['sla', 'wortel', 'erwt', 'spinazie'],
    slecht: [],
  },
  {
    id: 'ui', naam: 'Ui', soort: 'groente',
    sprite: ['....g...', '...gg...', '...yy...', '..yyyy..', '.yYyyyY.', '.yyyyyy.', '..yYYy..', '...ww...'],
    z: [3, 4], o: [7, 8, 9],
    zaaien: 'Plantuitjes in maart/april in de grond drukken, puntje boven.',
    water: 'Weinig.',
    zon: 'Zon.',
    afstand: '10 cm',
    tip: 'Oogsten als het loof omvalt. Laat ze daarna een paar dagen drogen.',
    goed: ['wortel', 'tomaat', 'aardbei', 'sla'],
    slecht: ['boon', 'erwt'],
  },
  {
    id: 'aardappel', naam: 'Aardappel', soort: 'groente',
    sprite: ['........', '..kkkk..', '.kccbck.', 'kccccccb', 'kcbcccck', '.kccccbk', '..kkkk..', '........'],
    z: [4], o: [6, 7, 8, 9],
    zaaien: 'Pootaardappels in april in de grond, zo\'n 10 cm diep.',
    water: 'Matig, meer als ze bloeien.',
    zon: 'Zon.',
    afstand: '35 cm',
    tip: 'Aanaarden: schep grond tegen de stengels, dan krijg je meer aardappels.',
    goed: ['boon', 'spinazie'],
    slecht: ['tomaat', 'courgette', 'pompoen', 'komkommer', 'framboos', 'zonnebloem'],
  },
  {
    id: 'prei', naam: 'Prei', soort: 'groente',
    sprite: ['g.....g.', '.g...g..', '..g.g...', '...gg...', '...lw...', '...ww...', '...ww...', '..w..w..'],
    z: [3, 4, 5, 6], o: [9, 10, 11, 12, 1, 2],
    zaaien: 'Binnen zaaien in maart/april, in juni uitplanten.',
    water: 'Matig.',
    zon: 'Zon.',
    afstand: '15 cm',
    tip: 'Plant ze diep in een gat met een plantstok, dan krijg je een lange witte schacht.',
    goed: ['wortel', 'aardbei', 'sla'],
    slecht: ['boon', 'erwt'],
  },
  {
    id: 'spinazie', naam: 'Spinazie', soort: 'groente',
    sprite: ['.gg..gg.', 'gGggggGg', 'ggGggGgg', '.ggGGgg.', '..gGGg..', '...GG...', '...G....', '........'],
    z: [3, 4, 5, 8, 9], o: [4, 5, 6, 9, 10, 11],
    zaaien: 'Vroeg in het voorjaar of in de nazomer, direct buiten.',
    water: 'Regelmatig.',
    zon: 'Halfschaduw is prima.',
    afstand: '10 cm',
    tip: 'Bij lange zomerdagen gaat spinazie bloeien. Zaai dus vroeg of laat in het jaar.',
    goed: ['aardbei', 'radijs', 'aardappel'],
    slecht: [],
  },
  {
    id: 'komkommer', naam: 'Komkommer', soort: 'groente',
    sprite: ['........', '......G.', '.gggggG.', 'glglglgg', 'gggggggg', '.Gggggg.', '........', '........'],
    z: [4, 5], o: [7, 8, 9],
    zaaien: 'Binnen zaaien in april, eind mei naar buiten.',
    water: 'Veel, liefst lauw water.',
    zon: 'Zon, beschut tegen wind.',
    afstand: '60 cm',
    tip: 'Laat hem langs gaas of een rek klimmen, dat scheelt ruimte.',
    goed: ['boon', 'erwt', 'mais', 'sla', 'zonnebloem'],
    slecht: ['aardappel'],
  },
  {
    id: 'pompoen', naam: 'Pompoen', soort: 'groente',
    sprite: ['...Gb...', '...b....', '.oooooo.', 'oOoooOoo', 'oOoooOoo', 'oOoooOoo', '.oooooo.', '........'],
    z: [4, 5], o: [9, 10],
    zaaien: 'Binnen zaaien in april, half mei naar buiten.',
    water: 'Veel.',
    zon: 'Volle zon.',
    afstand: '150 cm (neemt veel ruimte)',
    tip: 'Leg een plankje onder de pompoen zodat hij niet rot.',
    goed: ['mais', 'boon'],
    slecht: ['aardappel'],
  },
  {
    id: 'paprika', naam: 'Paprika', soort: 'groente',
    sprite: ['...G....', '..gG....', '.yyyyyy.', 'yywyyyyy', 'yyyyyyyy', 'yyyYyyyy', '.yY.yYy.', '........'],
    z: [2, 3, 5], o: [8, 9, 10],
    zaaien: 'Binnen zaaien in februari/maart, eind mei naar buiten of in een kas.',
    water: 'Regelmatig.',
    zon: 'Warm en zonnig.',
    afstand: '45 cm',
    tip: 'Houdt van warmte. Een plek tegen een zonnige muur of in een pot werkt goed.',
    goed: ['basilicum', 'ui'],
    slecht: [],
  },
  {
    id: 'basilicum', naam: 'Basilicum', soort: 'kruid',
    sprite: ['...l....', '..lgl...', '.lgglgl.', '..gggl..', '.lggggl.', '..gGgg..', '...G....', '...G....'],
    z: [4, 5], o: [6, 7, 8, 9],
    zaaien: 'Binnen in april, pas eind mei naar buiten.',
    water: 'Matig, liefst \'s ochtends.',
    zon: 'Zon en warm.',
    afstand: '20 cm',
    tip: 'Knip de toppen eraf, dan wordt hij lekker bossig.',
    goed: ['tomaat', 'paprika'],
    slecht: [],
  },
  {
    id: 'peterselie', naam: 'Peterselie', soort: 'kruid',
    sprite: ['l.l..l.l', 'glg.glg.', '.g..g...', '..g.g.g.', '...ggg..', '....G...', '...G....', '...G....'],
    z: [3, 4, 5, 6, 7], o: [6, 7, 8, 9, 10, 11],
    zaaien: 'Van maart tot juli, direct buiten.',
    water: 'Regelmatig.',
    zon: 'Halfschaduw.',
    afstand: '20 cm',
    tip: 'Kiemt traag (3 à 4 weken). Week de zaadjes een nachtje in water.',
    goed: ['tomaat'],
    slecht: ['sla'],
  },
  {
    id: 'framboos', naam: 'Framboos', soort: 'fruit',
    sprite: ['...gg...', '..gGg...', '.PrPrP..', '.rPrPr..', '.PrPrP..', '..rPr...', '...r....', '........'],
    z: [11, 12, 1, 2, 3], o: [7, 8, 9],
    zaaien: 'Struikjes planten tussen november en maart.',
    water: 'Regelmatig.',
    zon: 'Zon.',
    afstand: '50 cm',
    tip: 'Geef ze steun met een draad en knip na de oogst de gedragen takken weg.',
    goed: [],
    slecht: ['aardappel', 'tomaat'],
  },
  {
    id: 'bes', naam: 'Blauwe bes', soort: 'fruit',
    sprite: ['....G...', '...G.G..', '..G...G.', '.BBB.BBB', '.BwB.BwB', '.BBB.BBB', '..BB..B.', '........'],
    z: [10, 11, 3, 4], o: [7, 8],
    zaaien: 'Struik planten in de herfst of het vroege voorjaar.',
    water: 'Regenwater (kraanwater is te kalkrijk).',
    zon: 'Zon.',
    afstand: '120 cm',
    tip: 'Wil zure grond: plant in rhododendron-grond of in een grote pot.',
    goed: ['aardbei'],
    slecht: [],
  },
  {
    id: 'mais', naam: 'Maïs', soort: 'groente',
    sprite: ['...g....', '..gyg...', '..yyyg..', '.gyyyg..', '.gyYyg..', '.gyyyg..', '..gyg...', '...g....'],
    z: [4, 5], o: [8, 9],
    zaaien: 'Binnen in april of buiten vanaf half mei.',
    water: 'Regelmatig.',
    zon: 'Volle zon.',
    afstand: '40 cm',
    tip: 'Plant in een blok in plaats van één lange rij, dan bestuiven ze elkaar beter.',
    goed: ['boon', 'pompoen', 'courgette', 'erwt', 'komkommer', 'zonnebloem'],
    slecht: ['tomaat'],
  },
  {
    id: 'zonnebloem', naam: 'Zonnebloem', soort: 'bloem',
    sprite: ['..y.y...', '.yybyy..', 'yybbbyy.', '.ybbby..', '..yyy...', '...g.g..', '..gg.g..', '...g....'],
    z: [4, 5], o: [7, 8, 9],
    zaaien: 'Direct buiten in april of mei.',
    water: 'Regelmatig.',
    zon: 'Volle zon (hij draait mee!).',
    afstand: '40 cm',
    tip: 'Lokt bijen naar je moestuin. De zaden zijn in de winter lekker voor vogels.',
    goed: ['komkommer', 'mais'],
    slecht: ['aardappel'],
  },
];

export const PLANT = Object.fromEntries(PLANTEN.map((p) => [p.id, p]));

// Burenrelatie tussen twee planten: 'goed', 'slecht' of null. Werkt in beide richtingen.
export function relatie(a, b) {
  if (a === b) return null;
  const pa = PLANT[a];
  const pb = PLANT[b];
  if (!pa || !pb) return null;
  if (pa.slecht.includes(b) || pb.slecht.includes(a)) return 'slecht';
  if (pa.goed.includes(b) || pb.goed.includes(a)) return 'goed';
  return null;
}
