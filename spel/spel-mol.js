// Een mol die af en toe in het gras even uit een molshoop komt kijken.
// Puur voor de gezelligheid: geen punten, geen straf, hij zit nooit in de weg.
// Tik je hem, dan schrikt hij en duikt weg. Dit bestand doet alleen de mol zelf;
// spel.js zegt wanneer hij mag komen (de tijden staan daar bovenin) en tekent hem.
import { KLEUR, tekenTekst } from './spel-sprites.js';

const rnd = (a, b) => a + Math.random() * (b - a);

// Hoe lang elke stap duurt, in seconden
const DUUR = {
  hoop: 0.8, // de molshoop komt omhoog
  op: 0.35, // de mol kruipt eruit
  onder: 0.3, // en duikt weer weg
  schrik: 0.3, // na een tik: even schrikken...
  duik: 0.12, // ...en heel snel weg
  blijf: 3, // de molshoop blijft nog even liggen
  weg: 0.8, // en zakt dan weg
};

const MOL_KLEUR = {
  M: '#4b4048', // fluwelen vacht
  m: '#75666e', // glans
  k: KLEUR.k,
  p: KLEUR.p, // neusje en graafpootjes
  w: KLEUR.w,
};
const HOOP_KLEUR = { b: KLEUR.b, B: KLEUR.B, L: '#a86a48', k: KLEUR.k };

// De mol: 7 breed, 7 hoog. Alleen de bovenkant steekt uit de hoop.
const KOP = ['..MMM..', '.MmmMM.'];
const POOTJES = ['ppMMMpp', 'ppMMMpp'];
const MOL = {
  midden: [...KOP, 'MkMMMkM', 'MMMpMMM', 'MMpppMM', ...POOTJES],
  snuif: [...KOP, 'MkMMMkM', 'MMpppMM', 'MMMpMMM', ...POOTJES],
  links: [...KOP, 'kMMMkMM', 'MMpMMMM', 'MpppMMM', ...POOTJES],
  rechts: [...KOP, 'MMkMMMk', 'MMMMpMM', 'MMMpppM', ...POOTJES],
  schrik: [...KOP, 'MwMMMwM', 'MMpppMM', 'MMpppMM', ...POOTJES],
};
const MOL_H = 7;

// De molshoop: 7 breed, 4 hoog. Het gat zit in de tweede rij.
const HOOP = ['..LbL..', '.bLbbb.', 'bbbLbbL', 'BbBbBbB'];
const GAT = '.kkkkk.';

// Wat de mol doet als hij boven is: [houding, seconden]
const KIJKEN = [
  ['midden', 0.5],
  ['snuif', 0.15],
  ['midden', 0.15],
  ['snuif', 0.15],
  ['links', 0.55],
  ['midden', 0.25],
  ['rechts', 0.55],
  ['midden', 0.3],
  ['snuif', 0.15],
  ['midden', 0.4],
];
const KIJK_DUUR = KIJKEN.reduce((som, [, t]) => som + t, 0);

function maakPlaatje(raster, kleuren) {
  const c = document.createElement('canvas');
  c.width = raster[0].length;
  c.height = raster.length;
  const ctx = c.getContext('2d');
  raster.forEach((rij, y) => [...rij].forEach((teken, x) => {
    if (!kleuren[teken]) return;
    ctx.fillStyle = kleuren[teken];
    ctx.fillRect(x, y, 1, 1);
  }));
  return c;
}

let plaatjes = null;
const maakPlaatjes = () => ({
  mol: Object.fromEntries(Object.entries(MOL).map(([naam, r]) => [naam, maakPlaatje(r, MOL_KLEUR)])),
  hoop: maakPlaatje(HOOP, HOOP_KLEUR),
  gat: maakPlaatje([GAT], HOOP_KLEUR),
});

/**
 * Een nieuwe mol voor een nieuw spel.
 * plekken: waar een molshoop mag komen ({x, y} = het gat), allemaal in het gras.
 * tijden: { eerste: [min, max], tussen: [min, max] } in seconden speeltijd.
 */
export function maakMol(plekken, tijden) {
  return { plekken, tijden, fase: 'slaapt', t: 0, wacht: rnd(...tijden.eerste), plek: null, kruimels: [] };
}

function zetFase(mol, fase) {
  mol.fase = fase;
  mol.t = 0;
}

function kruimels(mol, aantal, kracht = 1) {
  const { x, y } = mol.plek;
  for (let i = 0; i < aantal; i++) {
    mol.kruimels.push({
      x: x + rnd(-3, 3),
      y: y - 1,
      vx: rnd(-12, 12) * kracht,
      vy: rnd(-26, -10) * kracht,
      t: rnd(0.3, 0.6),
      kleur: Math.random() < 0.5 ? KLEUR.b : KLEUR.B,
    });
  }
}

/** Laat de mol verder leven. Alleen aanroepen als het gewone spel loopt. */
export function werkMolBij(mol, dt) {
  mol.t += dt;
  for (const k of mol.kruimels) {
    k.t -= dt;
    k.vy += 70 * dt;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
  }
  mol.kruimels = mol.kruimels.filter((k) => k.t > 0);

  switch (mol.fase) {
    case 'slaapt':
      if (mol.t < mol.wacht) return;
      // niet twee keer achter elkaar op dezelfde plek
      mol.plek = kies(mol.plekken.filter((p) => p !== mol.vorige)) ?? mol.plekken[0];
      mol.vorige = mol.plek;
      mol.boven = rnd(0.85, 1.15) * KIJK_DUUR;
      return zetFase(mol, 'hoop');
    case 'hoop':
      if (Math.random() < dt * 14) kruimels(mol, 1, 0.6);
      if (mol.t >= DUUR.hoop) {
        kruimels(mol, 5);
        zetFase(mol, 'op');
      }
      return;
    case 'op':
      if (mol.t >= DUUR.op) zetFase(mol, 'kijkt');
      return;
    case 'kijkt':
      if (mol.t >= mol.boven) zetFase(mol, 'onder');
      return;
    case 'schrik':
      if (mol.t >= DUUR.schrik) zetFase(mol, 'duik');
      return;
    case 'onder':
    case 'duik':
      if (mol.t >= DUUR[mol.fase]) {
        kruimels(mol, mol.fase === 'duik' ? 6 : 2, mol.fase === 'duik' ? 1.2 : 0.6);
        zetFase(mol, 'blijf');
      }
      return;
    case 'blijf':
      if (mol.t >= DUUR.blijf) zetFase(mol, 'weg');
      return;
    case 'weg':
      if (mol.t >= DUUR.weg) {
        zetFase(mol, 'slaapt');
        mol.wacht = rnd(...mol.tijden.tussen);
      }
  }
}

const kies = (lijst) => lijst[Math.floor(Math.random() * lijst.length)];

/** Hoeveel rijen van de mol boven de hoop uitsteken (0 tot 8). */
function hoogte(mol) {
  const f = (deel) => Math.round(MOL_H * Math.max(0, Math.min(1, deel)));
  switch (mol.fase) {
    case 'op':
      return f(mol.t / DUUR.op);
    case 'kijkt':
    case 'schrik':
      return MOL_H;
    case 'onder':
      return f(1 - mol.t / DUUR.onder);
    case 'duik':
      return f(1 - mol.t / DUUR.duik);
    default:
      return 0;
  }
}

function houding(mol) {
  if (mol.fase === 'schrik') return 'schrik';
  if (mol.fase !== 'kijkt') return 'midden';
  let t = mol.t % KIJK_DUUR;
  for (const [naam, duur] of KIJKEN) {
    if (t < duur) return naam;
    t -= duur;
  }
  return 'midden';
}

/** Is de mol nu te tikken, en raakt (x, y) hem? Dan schrikt hij en duikt weg. */
export function tikMol(mol, x, y) {
  if (mol.fase !== 'kijkt' && mol.fase !== 'op') return false;
  const { x: mx, y: my } = mol.plek;
  if (Math.abs(x - mx) > 5 || y < my - MOL_H - 2 || y > my + 2) return false;
  zetFase(mol, 'schrik');
  kruimels(mol, 3, 0.5);
  return true;
}

/** Tekent de molshoop, de mol en de kruimels. */
export function tekenMol(ctx, mol) {
  plaatjes ??= maakPlaatjes();
  if (mol.plek && mol.fase !== 'slaapt') {
    const { x, y } = mol.plek;
    const links = x - 3;
    const boven = y - 2;
    // hoeveel rijen van de hoop er al (of nog) liggen
    const rijen = mol.fase === 'hoop'
      ? Math.ceil(4 * Math.min(1, mol.t / DUUR.hoop))
      : mol.fase === 'weg'
        ? Math.ceil(4 * (1 - mol.t / DUUR.weg))
        : 4;
    const { hoop } = plaatjes;
    if (rijen > 0) {
      // de hoop groeit van onderen op
      ctx.drawImage(hoop, 0, 4 - rijen, 7, rijen, links, boven + 4 - rijen, 7, rijen);
    }
    if (rijen === 4 && mol.fase !== 'hoop') ctx.drawImage(plaatjes.gat, links, y - 1);
    const h = hoogte(mol);
    if (h > 0) {
      const img = plaatjes.mol[houding(mol)];
      const schud = mol.fase === 'schrik' ? (Math.floor(mol.t * 30) % 2 ? 1 : -1) : 0;
      ctx.drawImage(img, 0, 0, 7, h, x - 3 + schud, y - h, 7, h);
      // de voorkant van de hoop ligt over de pootjes heen
      ctx.drawImage(hoop, 0, 2, 7, 2, links, y, 7, 2);
      if (mol.fase === 'schrik') tekenTekst(ctx, '!', x, y - MOL_H - 7, KLEUR.y);
    }
  }
  for (const k of mol.kruimels) {
    ctx.fillStyle = k.kleur;
    ctx.fillRect(Math.round(k.x), Math.round(k.y), 1, 1);
  }
}
