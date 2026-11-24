// Pixelart-plaatjes als tekstrasters. Elk teken is één pixel; '.' is doorzichtig.
// Het spel en de moestuinplanner gebruiken dezelfde plaatjes.

const PALET = {
  k: '#2b1d14', // omlijning
  r: '#e43b44', // rood
  R: '#a22633', // donkerrood
  o: '#f77622', // oranje
  y: '#fee761', // geel
  g: '#63c74d', // groen
  G: '#3e8948', // donkergroen
  b: '#8f563b', // bruin
  B: '#5d3a28', // donkerbruin
  w: '#ffffff', // wit
  p: '#f6a0c0', // roze
  s: '#c0cbdc', // grijs
  u: '#0099db', // blauw
  a: '#d19a4a', // donker goud (graan)
  O: '#b84a12', // donkeroranje
};

export const SPRITES = {
  tomaat: [
    '....GG....',
    '...GgGG...',
    '..kkGGkk..',
    '.krrrrrrk.',
    'krrwrrrrrk',
    'krwrrrrrrk',
    'krrrrrrrRk',
    'krrrrrrRRk',
    '.kRrrrRRk.',
    '..kkkkkk..',
  ],
  wortel: [
    '...g.g....',
    '..gGgGg...',
    '...GgG....',
    '..koook...',
    '..kooook..',
    '...koook..',
    '...kook...',
    '....kok...',
    '....kok...',
    '.....k....',
  ],
  radijs: [
    '...g..g...',
    '..gGggGg..',
    '...gGGg...',
    '..kkrrkk..',
    '.krrrrrrk.',
    '.krwrrrrk.',
    '.krrrrrRk.',
    '..kRrrRk..',
    '...kkkk...',
    '....kw....',
  ],
  aardbei: [
    '..gGggGg..',
    '...gGGg...',
    '.kkrrrrkk.',
    'krryrrryrk',
    'krrrryrrrk',
    '.kryrrrrk.',
    '.krrrryrk.',
    '..kryrrk..',
    '...krrk...',
    '....kk....',
  ],
  pompoen: [
    '.....Gb...',
    '....bG....',
    '..kkkbkk..',
    '.kooyooyk.',
    'kooyooyook',
    'kooyooyook',
    'kooyooyook',
    'kooyooyoBk',
    '.kBoyoBBk.',
    '..kkkkkk..',
  ],
  // Graan: een bosje van drie aren (zoals het emoji-graan), met kafnaaldjes en een oranje bandje. 12x12.
  graan: [
    'a.....a....a',
    '.a....y...a.',
    '.y...yyy..y.',
    'yyy..aOy.yyy',
    'aOy..yOa.aOy',
    'yOa..aOy.yOa',
    '.aOy.yOa.aOy',
    '.yOa.aOy.yOa',
    '..ay..a..ya.',
    '...b..b..b..',
    '....bOoOb...',
    '....b.b.b...',
  ],
  kiemplant: [
    '..........',
    '..........',
    '..gg..gg..',
    '.gGGggGGg.',
    '..gGggGg..',
    '....gG....',
    '....gG....',
    '...bGGb...',
    '..bBBBBb..',
    '..........',
  ],
  zaadje: [
    '..........',
    '..........',
    '..........',
    '..........',
    '....yy....',
    '...ybby...',
    '...bbbb...',
    '..bBBBBb..',
    '.bBBBBBBb.',
    '..........',
  ],
  luis: [
    '..........',
    '..k....k..',
    '...k..k...',
    '..kggggk..',
    '.kgGggGgk.',
    'kgggggggk.',
    '.kgggggk..',
    '.k.k.k.k..',
    '..........',
    '..........',
  ],
  slak: [
    '..........',
    '.....kkk..',
    '....kbybk.',
    '...kbyBybk',
    'k..kbBybBk',
    'yk.kbbbbk.',
    'kyyyyyyyyk',
    '.kkkkkkkk.',
    '..........',
    '..........',
  ],
  hartje: [
    '..........',
    '.kk...kk..',
    'krrk.krrk.',
    'krwrkrrrk.',
    'krrrrrrrk.',
    '.krrrrrk..',
    '..krrrk...',
    '...krk....',
    '....k.....',
    '..........',
  ],
  zon: [
    '....y.....',
    '.y..y..y..',
    '..yyyyy...',
    '.yyyyyyy..',
    'yyyyoyyyyy',
    '.yyyyyyy..',
    '..yyyyy...',
    '.y..y..y..',
    '....y.....',
    '..........',
  ],
  brood: [
    '..........',
    '...kkkkk..',
    '..kyoooyk.',
    '.kooyoyook',
    'kboooooobk',
    'kbyoyoyobk',
    'kbbbbbbbbk',
    '.kBBBBBBk.',
    '..kkkkkk..',
    '..........',
  ],
  gieter: [
    '..........',
    '...kkkk...',
    '..k....k..',
    '.kssssssk.',
    'kkssussskk',
    'k.ssssss.k',
    '..ssssss..',
    '..ssssss..',
    '...kkkk...',
    '..........',
  ],
};

const cache = new Map();

/** Geeft een data-URL van een sprite, geschaald zodat de browser hem scherp toont. */
export function spriteUrl(naam) {
  if (cache.has(naam)) return cache.get(naam);
  const raster = SPRITES[naam];
  if (!raster) throw new Error(`Onbekende sprite: ${naam}`);
  const breedte = Math.max(...raster.map((r) => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = breedte;
  canvas.height = raster.length;
  const ctx = canvas.getContext('2d');
  raster.forEach((rij, y) => {
    [...rij].forEach((teken, x) => {
      const kleur = PALET[teken];
      if (!kleur) return;
      ctx.fillStyle = kleur;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  const url = canvas.toDataURL();
  cache.set(naam, url);
  return url;
}

/** Maakt een <img> voor een sprite. */
export function sprite(naam, { grootte = 48, alt = '', klasse = '' } = {}) {
  const img = document.createElement('img');
  img.src = spriteUrl(naam);
  img.width = grootte;
  img.height = grootte;
  img.alt = alt;
  img.className = `sprite ${klasse}`.trim();
  img.draggable = false;
  return img;
}
