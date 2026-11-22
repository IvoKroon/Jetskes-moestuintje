// Plaatjes en tekenhulpjes die alleen het spel gebruikt.
// De groente zelf komt uit shared/sprites.js, zodat het spel en de rest van de site
// dezelfde tomaat, wortel enzovoort tonen.
import { SPRITES } from '../shared/sprites.js';

// Zelfde kleuren als shared/sprites.js, plus een paar voor rotte groente.
export const KLEUR = {
  k: '#2b1d14', // inkt
  r: '#e43b44',
  R: '#a22633',
  o: '#f77622',
  y: '#fee761',
  g: '#63c74d',
  G: '#3e8948',
  b: '#8f563b',
  B: '#5d3a28',
  w: '#ffffff',
  p: '#f6a0c0',
  s: '#c0cbdc',
  u: '#0099db',
  l: '#8fd3ff', // lucht
  O: '#b84a12', // donkeroranje
  z: '#3a3436', // zwarte vacht
  T: '#8a6a48', // cyperse vacht
  t: '#4d3a28', // cyperse strepen
  c: '#e3cfa8', // lichte buik
  a: '#d19a4a', // lichtbruin blad (te veel water)
  x: '#8a7650', // rot
  X: '#5c4a30', // donker rot
  v: '#8b8b3a', // verwelkt blad
  V: '#5c5c26',
};

// Hoe een rijpe groente verkleurt als hij rot.
// Hoe een plantje kleurt na te veel water: bruin blad.
const BRUIN = { g: 'a', G: 'X', y: 'a' };

const ROT = { r: 'x', R: 'X', o: 'x', y: 'X', g: 'v', G: 'V', w: 's', p: 'x' };

const EIGEN = {
  jong: [
    '..........',
    '....g.....',
    '...gGg....',
    '.g.gGg.g..',
    'gGg.G.gGg.',
    '.gGgGgGg..',
    '..gGGGg...',
    '....G.....',
    '...bGGb...',
    '..bBBBBb..',
  ],
  lieveheersbeestje: [
    '..k....k..',
    '...k..k...',
    '...kkkk...',
    '..kkkkkk..',
    '.krrkkrrk.',
    'krkrkkrrrk',
    'krrrkkrkrk',
    'krkrkkrrrk',
    '.krrkkrrk.',
    '..kkkkkk..',
  ],
  muntje: ['.kkk.', 'kyyyk', 'kywyk', 'kyyyk', '.kkk.'],
  botje: ['ww...ww', 'wswwwsw', 'ww...ww'],
  druppel: ['..k..', '.kuk.', 'kuulk', 'kuuuk', '.kkk.'],
  glinster: ['..y..', '.yyy.', 'yywyy', '.yyy.', '..y..'],
  glinsterKlein: ['.....', '..y..', '.ywy.', '..y..', '.....'],
};

function maak(raster, omzet) {
  const breedte = Math.max(...raster.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = breedte;
  c.height = raster.length;
  const ctx = c.getContext('2d');
  raster.forEach((rij, y) => {
    [...rij].forEach((teken, x) => {
      const kleur = KLEUR[omzet?.[teken] ?? teken];
      if (!kleur || teken === '.') return;
      ctx.fillStyle = kleur;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

const cache = new Map();

/** Een sprite als canvas, klaar voor drawImage. `rot` geeft de verrotte versie. */
export function plaatje(naam, { rot = false, bruin = false } = {}) {
  const sleutel = `${naam}${rot ? ':rot' : ''}${bruin ? ':bruin' : ''}`;
  if (!cache.has(sleutel)) {
    const raster = EIGEN[naam] ?? SPRITES[naam];
    if (!raster) throw new Error(`Onbekende sprite: ${naam}`);
    cache.set(sleutel, maak(raster, rot ? ROT : bruin ? BRUIN : null));
  }
  return cache.get(sleutel);
}

export function plaatjeUrl(naam) {
  return plaatje(naam).toDataURL();
}

// Een stukje omgespitte grond (16x16) met voren.
export function maakGrond(grootte) {
  const c = document.createElement('canvas');
  c.width = c.height = grootte;
  const ctx = c.getContext('2d');
  ctx.fillStyle = KLEUR.B;
  ctx.fillRect(1, 0, grootte - 2, grootte);
  ctx.fillRect(0, 1, grootte, grootte - 2);
  ctx.fillStyle = KLEUR.b;
  ctx.fillRect(1, 1, grootte - 2, grootte - 3);
  ctx.fillStyle = KLEUR.B;
  for (let y = 4; y < grootte - 2; y += 4) ctx.fillRect(2, y, grootte - 4, 1);
  // vaste 'willekeurige' korreltjes, zodat elk vakje er hetzelfde uitziet
  let zaad = 7;
  const rnd = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = '#a86a48';
  for (let i = 0; i < 10; i++) ctx.fillRect(1 + Math.floor(rnd() * (grootte - 2)), 1 + Math.floor(rnd() * (grootte - 4)), 1, 1);
  return c;
}

// Het grasveld als achtergrond, met wat bloemetjes.
export function maakGras(breedte, hoogte) {
  const c = document.createElement('canvas');
  c.width = breedte;
  c.height = hoogte;
  const ctx = c.getContext('2d');
  ctx.fillStyle = KLEUR.g;
  ctx.fillRect(0, 0, breedte, hoogte);
  let zaad = 42;
  const rnd = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * breedte);
    const y = Math.floor(rnd() * hoogte);
    ctx.fillStyle = KLEUR.G;
    ctx.fillRect(x, y, 1, 1);
    if (rnd() < 0.5) ctx.fillRect(x + 1, y - 1, 1, 1);
  }
  const bloem = [KLEUR.w, KLEUR.y, KLEUR.p];
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = bloem[i % 3];
    ctx.fillRect(Math.floor(rnd() * breedte), Math.floor(rnd() * hoogte), 1, 1);
  }
  return c;
}

// Mini pixelletters (3x5) voor zwevende punten in het veld.
const LETTERS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
  '-': ['000', '000', '111', '000', '000'],
  x: ['000', '101', '010', '101', '000'],
  '!': ['010', '010', '010', '000', '010'],
};

/** Tekent tekst gecentreerd rond x, met een donkere rand zodat hij overal leesbaar is. */
export function tekenTekst(ctx, tekst, x, y, kleur) {
  const tekens = [...String(tekst)];
  const breedte = tekens.length * 4 - 1;
  const start = Math.round(x - breedte / 2);
  const top = Math.round(y);
  const zet = (dx, dy, k) => {
    ctx.fillStyle = k;
    tekens.forEach((t, i) => {
      const l = LETTERS[t];
      if (!l) return;
      l.forEach((rij, ry) => {
        [...rij].forEach((bit, rx) => {
          if (bit === '1') ctx.fillRect(start + i * 4 + rx + dx, top + ry + dy, 1, 1);
        });
      });
    });
  };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) zet(dx, dy, KLEUR.k);
  zet(0, 0, kleur);
}

// ---------- Katten ----------
// Eén vorm voor beide katten (12x8, kijkt naar rechts); de letters worden per kat ingekleurd:
// A = vacht, Z = rug, D = strepen, H = kop, E = oog, M = snuit, W = poten en borst, N = neusje.
const KAT_VORM = {
  loop1: [
    'Z........k.k',
    'Z.......kHHk',
    '.kkkkkkkHEHk',
    '.kAZZZZZHMMN',
    '.kDAZZDAWMWk',
    '.kAAAAAAWWk.',
    '.kW.kW..kW..',
    '.kk.kk..kk..',
  ],
  loop2: [
    'Z........k.k',
    'Z.......kHHk',
    '.kkkkkkkHEHk',
    '.kAZZZZZHMMN',
    '.kDAZZDAWMWk',
    '.kAAAAAAWWk.',
    '..kW..kW.kW.',
    '..kk..kk.kk.',
  ],
  zit: [
    '.........k.k',
    '........kHHk',
    'Z.kkkkkkHEHk',
    'ZkAZZZZZHMMN',
    'ZkDAZZDAWMWk',
    '.kAAAAAAWWk.',
    '.kW......kW.',
    '.kk......kk.',
  ],
  // even door de knieën, staart omhoog
  plas: [
    'Z........k.k',
    'Z.......kHHk',
    'Z.......HEHk',
    '.kkkkkkkHMMN',
    '.kAZZZZZWMWk',
    '.kDAZZAAWWk.',
    '.kAAAAAAAWk.',
    'kWk.....kW..',
  ],
  // kop omlaag, voorpootjes graven
  graaf1: [
    'Z...........',
    'Z...........',
    '.kkkkkkkk.k.',
    '.kAZZZZZAkHk',
    '.kDAZZDAHEHk',
    '.kAAAAAAHMMN',
    '.kW.kW..WMWk',
    '.kk.kk.kW.k.',
  ],
  graaf2: [
    'Z...........',
    'Z...........',
    '.kkkkkkkk.k.',
    '.kAZZZZZAkHk',
    '.kDAZZDAHEHk',
    '.kAAAAAAHMMN',
    '.kW.kW..WMWk',
    '.kk.kk...kWk',
  ],
};

// zwart-wit: witte vacht met zwarte vlekken, zwart masker met witte snuit;
// cyperse: bruin met donkere strepen en een lichte buik
const KAT_KLEUR = {
  zwartwit: { A: 'w', Z: 'z', D: 'w', H: 'z', E: 'g', M: 'w', W: 'w', N: 'p' },
  cyperse: { A: 'T', Z: 't', D: 't', H: 'T', E: 'k', M: 'c', W: 'c', N: 'p' },
};

// Willem (de zwart-witte kat) heeft een aureooltje boven zijn kop.
const HALO = ['..yy', '.y..y'];

/**
 * Een kat in een bepaalde houding, als canvas van 12x10: twee lege rijen bovenaan
 * (waar bij Willem de halo zweeft) en daaronder de kat van 12x8.
 */
export function katPlaatje(soort, houding) {
  const sleutel = `kat:${soort}:${houding}`;
  if (!cache.has(sleutel)) {
    const lijf = maak(KAT_VORM[houding], KAT_KLEUR[soort]);
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 10;
    const ctx = c.getContext('2d');
    ctx.drawImage(lijf, 0, 2);
    if (soort === 'zwartwit') {
      // de halo volgt de kop: bij graven zit die twee rijen lager
      const y = houding.startsWith('graaf') ? 2 : 0;
      ctx.fillStyle = KLEUR.y;
      HALO.forEach((rij, dy) => [...rij].forEach((t, dx) => t === 'y' && ctx.fillRect(7 + dx, y + dy, 1, 1)));
    }
    cache.set(sleutel, c);
  }
  return cache.get(sleutel);
}
