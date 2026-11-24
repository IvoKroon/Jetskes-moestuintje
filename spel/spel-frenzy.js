// De vlierbes frenzy: na een minuut spelen staat de tuin even stil en groeien er ranken over het veld.
// Daaraan komen razendsnel trosjes vlierbessen, die je met tikken én vegen plukt (veel tegelijk).
// Na een paar seconden trekken de ranken zich terug en gaat het gewone spel verder.
// Dit bestand doet alleen de frenzy zelf (ranken, trosjes, tekenen); spel.js regelt punten en opslag.
import { KLEUR, plaatje } from './spel-sprites.js';

export const FRENZY = {
  groei: 1.6, // zo lang groeien de ranken over het veld
  pluk: 10, // zo lang kun je plukken
  krimp: 1.2, // zo lang trekken de ranken zich terug
  maxTrossen: 70,
  tussen: 0.035, // om de zoveel seconden een nieuw trosje
  bloei: 0.25, // eerst een wit bloemetje...
  groen: 0.4, // ...dan groene besjes...
  rijp: 2.8, // ...dan zwart-paars en plukbaar, zo lang...
  val: 0.45, // ...en anders vallen ze eraf (geen straf)
  straalTik: 7,
  straalVeeg: 5,
  voordoen: 2.4, // zo lang doet een handje aan het begin van het plukken voor hoe je veegt
};

const rnd = (a, b) => a + Math.random() * (b - a);

// Waar de besjes van een trosje zitten t.o.v. het midden; een tros heeft er 4 tot 9.
const BESJES = [[0, 0], [-1, 1], [1, 1], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [2, 2]];

/** Een rank: een kronkelend pad van pixels vanaf de rand het veld in, met blaadjes. */
function maakRank(W, H, start, hoek, lengte, wacht) {
  const punten = [];
  const blaadjes = [];
  let x = start.x;
  let y = start.y;
  let draai = rnd(-0.12, 0.12);
  for (let i = 0; punten.length < lengte && i < lengte * 3; i++) {
    draai = Math.max(-0.25, Math.min(0.25, draai + rnd(-0.08, 0.08)));
    hoek += draai;
    x += Math.cos(hoek) * 0.8;
    y += Math.sin(hoek) * 0.8;
    // tegen de rand: terugbuigen het veld in
    if (x < 1 || x > W - 2) { hoek = Math.PI - hoek; x = Math.max(1, Math.min(W - 2, x)); }
    if (y < 1 || y > H - 2) { hoek = -hoek; y = Math.max(1, Math.min(H - 2, y)); }
    const p = { x: Math.round(x), y: Math.round(y) };
    const vorige = punten[punten.length - 1];
    if (vorige && vorige.x === p.x && vorige.y === p.y) continue;
    punten.push(p);
    if (punten.length % 6 === 0) {
      const kant = punten.length % 12 === 0 ? 1 : -1;
      blaadjes.push({ i: punten.length - 1, dx: Math.round(-Math.sin(hoek) * kant), dy: Math.round(Math.cos(hoek) * kant) });
    }
  }
  return { punten, blaadjes, wacht };
}

export function maakFrenzy(W, H, keer = 1) {
  const ranken = [];
  // vanuit elke hoek en rand een rank, de hoofdranken eerst
  const starts = [
    { x: 0, y: 0, hoek: Math.PI / 4 },
    { x: W - 1, y: 0, hoek: (3 * Math.PI) / 4 },
    { x: 0, y: H - 1, hoek: -Math.PI / 4 },
    { x: W - 1, y: H - 1, hoek: (-3 * Math.PI) / 4 },
    { x: W / 2, y: 0, hoek: Math.PI / 2 },
    { x: W / 2, y: H - 1, hoek: -Math.PI / 2 },
    { x: 0, y: H / 2, hoek: 0 },
    { x: W - 1, y: H / 2, hoek: Math.PI },
  ];
  starts.forEach((s, n) => {
    const hoofd = maakRank(W, H, s, s.hoek + rnd(-0.3, 0.3), Math.round(rnd(55, 85)), n * 0.08);
    ranken.push(hoofd);
    // zijtakjes
    for (let t = 0; t < 2; t++) {
      const i = Math.floor(rnd(0.25, 0.7) * hoofd.punten.length);
      const p = hoofd.punten[i];
      if (!p) continue;
      const tak = maakRank(W, H, p, rnd(0, Math.PI * 2), Math.round(rnd(14, 28)), hoofd.wacht + (i / hoofd.punten.length) * 0.9);
      ranken.push(tak);
    }
  });
  return { fase: 'groei', t: 0, ranken, trossen: [], spawn: 0, geplukt: 0, keer };
}

/** Hoeveel van een rank er nu staat (0..1), ook tijdens het terugtrekken. */
function deelVan(f, rank) {
  if (f.fase === 'groei') return Math.max(0, Math.min(1, (f.t - rank.wacht) / (FRENZY.groei - 0.6)));
  if (f.fase === 'krimp') return Math.max(0, 1 - f.t / (FRENZY.krimp * 0.85));
  return 1;
}

function nieuweTros(f) {
  for (let poging = 0; poging < 6; poging++) {
    const rank = f.ranken[Math.floor(Math.random() * f.ranken.length)];
    const zicht = Math.floor(rank.punten.length * deelVan(f, rank));
    if (zicht < 4) continue;
    const p = rank.punten[Math.floor(rnd(2, zicht))];
    const x = p.x + Math.round(rnd(-1, 1));
    const y = p.y + 2;
    if (f.trossen.some((t) => Math.abs(t.x - x) < 3 && Math.abs(t.y - y) < 3)) continue;
    f.trossen.push({ x, y, steel: p, n: Math.floor(rnd(4, BESJES.length + 1)), t: 0, valt: 0 });
    return;
  }
}

const fase = (t) => (t.valt ? 'valt' : t.t < FRENZY.bloei ? 'bloei' : t.t < FRENZY.bloei + FRENZY.groen ? 'groen' : 'rijp');

/** Werkt de frenzy bij. Geeft true terug zolang hij nog bezig is. */
export function werkFrenzyBij(f, dt) {
  f.t += dt;
  if (f.fase === 'groei' && f.t >= FRENZY.groei) Object.assign(f, { fase: 'pluk', t: 0 });
  else if (f.fase === 'pluk' && f.t >= FRENZY.pluk) {
    Object.assign(f, { fase: 'krimp', t: 0 });
    for (const t of f.trossen) t.valt ||= 0.01; // alles wat er nog hangt valt eraf
  } else if (f.fase === 'krimp' && f.t >= FRENZY.krimp) return false;

  // Steeds sneller nieuwe trosjes: chaos!
  if (f.fase !== 'krimp' && (f.fase === 'pluk' || f.t > 0.5)) {
    f.spawn -= dt;
    const tempo = f.fase === 'pluk' ? FRENZY.tussen * (1 - 0.5 * Math.min(1, f.t / FRENZY.pluk)) : FRENZY.tussen * 2;
    while (f.spawn <= 0) {
      f.spawn += tempo;
      if (f.trossen.filter((t) => !t.valt).length < FRENZY.maxTrossen) nieuweTros(f);
    }
  }
  for (const t of f.trossen) {
    t.t += dt;
    if (t.valt) t.valt += dt;
    else if (t.t > FRENZY.bloei + FRENZY.groen + FRENZY.rijp) t.valt = 0.01;
  }
  f.trossen = f.trossen.filter((t) => !t.valt || t.valt < FRENZY.val);
  return true;
}

/** Plukt alle rijpe trosjes rond (x, y). Geeft de geplukte trosjes terug. */
export function pluk(f, x, y, straal) {
  if (f.fase === 'groei' && f.t < 0.5) return [];
  const raak = f.trossen.filter((t) => fase(t) === 'rijp' && Math.hypot(t.x - x, t.y - y) < straal);
  if (!raak.length) return raak;
  f.trossen = f.trossen.filter((t) => !raak.includes(t));
  for (const t of raak) f.geplukt += t.n;
  return raak;
}

// Vlierbessen: zwart-paars met een paars glimmertje
const PAARS = KLEUR.P;
const LICHTPAARS = KLEUR.q;
const DONKER = KLEUR.k;

/** Tekent de ranken en trosjes over het (stilstaande) veld. */
export function tekenFrenzy(ctx, f, W, H, tijd) {
  // het gewone spel staat stil: tuin iets donkerder
  const sterkte = f.fase === 'groei' ? Math.min(1, f.t / 0.6) : f.fase === 'krimp' ? Math.max(0, 1 - f.t / FRENZY.krimp) : 1;
  ctx.fillStyle = `rgba(30, 16, 40, ${0.5 * sterkte})`;
  ctx.fillRect(0, 0, W, H);

  for (const rank of f.ranken) {
    const zicht = Math.floor(rank.punten.length * deelVan(f, rank));
    ctx.fillStyle = KLEUR.G;
    for (let i = 0; i < zicht; i++) ctx.fillRect(rank.punten[i].x, rank.punten[i].y, 1, 1);
    // het groeipuntje licht op
    if (f.fase === 'groei' && zicht > 0 && zicht < rank.punten.length) {
      ctx.fillStyle = KLEUR.g;
      const p = rank.punten[zicht - 1];
      ctx.fillRect(p.x, p.y, 1, 1);
    }
    for (const b of rank.blaadjes) {
      if (b.i >= zicht) continue;
      const p = rank.punten[b.i];
      ctx.fillStyle = KLEUR.g;
      ctx.fillRect(p.x + b.dx, p.y + b.dy, 1, 1);
      ctx.fillRect(p.x + b.dx * 2, p.y + b.dy * 2, 1, 1);
      ctx.fillStyle = KLEUR.G;
      ctx.fillRect(p.x + b.dx * 2 + (b.dy ? 1 : 0), p.y + b.dy * 2 + (b.dx ? 1 : 0), 1, 1);
    }
  }

  for (const t of f.trossen) {
    const fs = fase(t);
    const val = t.valt ? Math.round(t.valt * t.valt * 120) : 0;
    if (!t.valt) {
      ctx.fillStyle = KLEUR.G;
      ctx.fillRect(t.steel.x, t.steel.y + 1, 1, 1);
    }
    const knipper = fs === 'rijp' && t.t > FRENZY.bloei + FRENZY.groen + FRENZY.rijp - 0.6 && Math.floor(tijd * 10) % 2;
    if (fs === 'rijp' && !t.valt) {
      tekenRijp(ctx, t, tijd, knipper);
      continue;
    }
    for (let i = 0; i < t.n; i++) {
      const [dx, dy] = BESJES[i];
      if (fs === 'bloei') ctx.fillStyle = i === 0 ? KLEUR.y : KLEUR.w;
      else if (fs === 'groen') ctx.fillStyle = KLEUR.g;
      else ctx.fillStyle = PAARS;
      if (fs === 'bloei' && i > 4) continue;
      ctx.fillRect(t.x + dx, t.y + dy + val, 1, 1);
    }
  }

  if (f.fase === 'pluk' && f.t < FRENZY.voordoen) tekenHandje(ctx, f, W, H);
}

// Per trosgrootte: welke pixels de tros vult (besjes plus de gaatjes ertussen) en de rand eromheen.
const VORMEN = Array.from({ length: BESJES.length + 1 }, (_, n) => {
  const besjes = new Set(BESJES.slice(0, n).map(([x, y]) => `${x},${y}`));
  const buren = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const vol = new Set(besjes);
  for (let y = -2; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    if (buren.filter(([ox, oy]) => besjes.has(`${x + ox},${y + oy}`)).length >= 2) vol.add(`${x},${y}`);
  }
  const rand = new Set();
  for (const c of vol) {
    const [x, y] = c.split(',').map(Number);
    for (const [ox, oy] of buren) if (!vol.has(`${x + ox},${y + oy}`)) rand.add(`${x + ox},${y + oy}`);
  }
  const lijst = (set) => [...set].map((c) => c.split(',').map(Number));
  return { vol: lijst(vol), rand: lijst(rand) };
});

/** Een rijp trosje: dikke paarse bol met een lichte rand en een glinster, en hij hupt op en neer (net als rijpe groente). */
function tekenRijp(ctx, t, tijd, knipper) {
  const { vol, rand } = VORMEN[t.n];
  const y = t.y + (Math.sin(tijd * 10 + t.x) > 0 ? -1 : 0);
  ctx.fillStyle = KLEUR.q;
  for (const [dx, dy] of rand) ctx.fillRect(t.x + dx, y + dy, 1, 1);
  ctx.fillStyle = knipper ? DONKER : PAARS;
  for (const [dx, dy] of vol) ctx.fillRect(t.x + dx, y + dy, 1, 1);
  if (Math.floor(tijd * 3 + t.x * 0.37) % 2) {
    ctx.fillStyle = KLEUR.w;
    ctx.fillRect(t.x - 1, y - 1, 1, 1);
  }
}

/** Een handje veegt heen en weer over het veld, met een spoortje erachter: zo pluk je. */
function tekenHandje(ctx, f, W, H) {
  const plek = (t) => {
    const heen = (t * 1.6) % 2; // 0..2: naar rechts en weer terug
    const x = 10 + (heen < 1 ? heen : 2 - heen) * (W - 26);
    return { x: Math.round(x), y: Math.round(H / 2 + Math.sin(t * 9) * 5) };
  };
  ctx.fillStyle = KLEUR.w;
  for (let k = 1; k <= 6; k++) {
    const s = plek(Math.max(0, f.t - k * 0.04));
    if (k % 2) ctx.fillRect(s.x, s.y, 1, 1);
  }
  const p = plek(f.t);
  ctx.drawImage(plaatje('hand'), p.x - 2, p.y);
}

/** Hoeveel tijd er nog is om te plukken (0..1), voor het balkje. */
export const plukOver = (f) => (f.fase === 'groei' ? 1 : f.fase === 'pluk' ? 1 - f.t / FRENZY.pluk : 0);
