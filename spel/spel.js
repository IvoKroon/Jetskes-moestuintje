// Moestuin Rush: zaai, oogst snel voordat het rot, en jaag de beestjes weg.
import { lees, bewaar } from '../shared/opslag.js';
import { plaatje, plaatjeUrl, maakGrond, maakGras, tekenTekst, KLEUR } from './spel-sprites.js';
import { geluid } from './spel-geluid.js';

// ---------- Instellingen ----------

// Het veld in 'echte' pixels; de browser vergroot het scherp.
const VAK = 16;
const TUSSEN = 2;
const MARGE = 4;
const KOLOMMEN = 3;
const RIJEN = 4;
const W = MARGE * 2 + KOLOMMEN * VAK + (KOLOMMEN - 1) * TUSSEN; // 60
const H = MARGE * 2 + RIJEN * VAK + (RIJEN - 1) * TUSSEN; // 78

// groeitijd en hoelang hij rijp blijft, in seconden
const GEWASSEN = {
  radijs: { naam: 'Radijs', meer: 'radijsjes', groei: 3, rijp: 3.2, punten: 10, vanaf: 0, kans: 3, kleur: KLEUR.r },
  wortel: { naam: 'Wortel', meer: 'wortels', groei: 4.5, rijp: 3.6, punten: 20, vanaf: 0, kans: 3, kleur: KLEUR.o },
  tomaat: { naam: 'Tomaat', meer: 'tomaten', groei: 6, rijp: 4, punten: 35, vanaf: 200, kans: 2, kleur: KLEUR.r },
  aardbei: { naam: 'Aardbei', meer: 'aardbeien', groei: 5, rijp: 2.6, punten: 45, vanaf: 600, kans: 2, kleur: KLEUR.r },
  pompoen: { naam: 'Pompoen', meer: 'pompoenen', groei: 9, rijp: 5, punten: 90, vanaf: 1200, kans: 1, kleur: KLEUR.o },
};

const BEESTJES = {
  luis: { snelheid: 7, leven: 1, eetTijd: 3.5, punten: 5, straal: 6 },
  slak: { snelheid: 3.5, leven: 2, eetTijd: 4.5, punten: 10, straal: 6 },
  lieveheersbeestje: { snelheid: 9, leven: 1, punten: -25, straal: 4 },
};

// Zaaien en oogsten gaan vanzelf; de speler geeft water en jaagt beestjes weg.
const DORST_TIJD = 6; // zo lang kan een plantje zonder water
const SNEL_WATER = 1; // binnen zoveel seconden water geven = extra punten
// zo lang blijft een vakje leeg voordat er vanzelf gezaaid wordt: rustig in level 1, daarna sneller
const zaaiPauze = (level) => Math.max(0.8, 3 - 0.6 * (level - 1));
const START_TUSSEN = 2.5; // aan het begin komt er om de zoveel seconden een plantje bij
const RIJP_TOON = 0.6; // zo lang zie je de rijpe groente voordat hij geoogst wordt

const LEVEL_DUUR = 25; // seconden per level
const COMBO_TIJD = 1.2;
const MAX_COMBO = 5; // x1, x1.5 ... x3
const MAX_HARTJES = 5;
const HARTJE_PER = 1500; // extra hartje per zoveel punten

// ---------- Elementen ----------

const $ = (id) => document.getElementById(id);
const canvas = $('veld');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
const bord = $('bord');
const scoreEl = $('score');
const recordEl = $('record');
const levelEl = $('level');
const hartjesEl = $('hartjes');
const meldingEl = $('melding');
const schermen = { start: $('start'), pauze: $('pauze'), einde: $('einde') };

const gras = maakGras(W, H);
const grond = maakGrond(VAK);

// ---------- Spelstand ----------

let S = null;
let toestand = 'start'; // start | spelen | pauze | einde

function nieuwSpel() {
  // in willekeurige volgorde, één voor één een plantje erbij
  const volgorde = [...Array(KOLOMMEN * RIJEN).keys()].sort(() => Math.random() - 0.5);
  S = {
    vakken: Array.from({ length: KOLOMMEN * RIJEN }, (_, i) => ({
      i,
      x: MARGE + (i % KOLOMMEN) * (VAK + TUSSEN),
      y: MARGE + Math.floor(i / KOLOMMEN) * (VAK + TUSSEN),
      fase: 'leeg', // leeg | groeit | rijp | rot | opgegeten
      gewas: null,
      t: 0,
      groei: 0,
      rijp: 0,
      wiebel: 0,
      wacht: volgorde.indexOf(i) * START_TUSSEN - zaaiPauze(1) + 0.5, // extra wachttijd voor het eerste zaadje
      dorsten: [], // op welke momenten van de groei hij dorst krijgt (0..1)
      perfect: true, // steeds snel water gehad
      dorstig: false,
      dorstT: 0,
      verwelkt: null,
    })),
    beestjes: [],
    deeltjes: [],
    zwevers: [],
    score: 0,
    hartjes: 3,
    volgendHartje: HARTJE_PER,
    level: 1,
    tijd: 0,
    combo: 0,
    laatsteWater: -9,
    beestjeKlok: 7,
    lieveKlok: 20,
    open: new Set(Object.keys(GEWASSEN).filter((g) => GEWASSEN[g].vanaf === 0)),
    geoogst: {},
    weggejaagd: 0,
    schud: 0,
  };
}

const moeilijk = () => {
  const l = S.level - 1;
  return {
    groei: Math.max(0.55, 1 - 0.06 * l),
    rijp: Math.max(0.5, 1 - 0.06 * l),
    beestjeTussen: Math.max(1.4, 5.5 - 0.5 * l),
    maxBeestjes: Math.min(1 + Math.floor((l + 1) / 2), 6),
    snel: 1 + 0.06 * l,
    eet: Math.max(0.55, 1 - 0.05 * l),
    dorstTijd: Math.max(3, DORST_TIJD - 0.4 * l),
  };
};

const rnd = (a, b) => a + Math.random() * (b - a);
const kies = (lijst) => lijst[Math.floor(Math.random() * lijst.length)];

// ---------- Acties ----------

function zaai(v) {
  const m = moeilijk();
  const lijst = [];
  for (const naam of S.open) for (let i = 0; i < GEWASSEN[naam].kans; i++) lijst.push(naam);
  const naam = kies(lijst);
  const g = GEWASSEN[naam];
  const groei = g.groei * m.groei * rnd(0.85, 1.15);
  // elk plantje heeft minstens één keer dorst; trage gewassen en hogere levels vaker
  let keren = g.groei > 5.5 ? 2 : 1;
  if (S.level >= 4 && Math.random() < 0.5) keren++;
  const dorsten = Array.from({ length: keren }, (_, k) => (k + 1) / (keren + 1) + rnd(-0.1, 0.1));
  Object.assign(v, { fase: 'groeit', gewas: naam, t: 0, groei, dorsten, perfect: true, dorstig: false, dorstT: 0, verwelkt: null });
  stof(v.x + 8, v.y + 12, KLEUR.b, 3);
  geluid.zaai();
}

function oogst(v) {
  const g = GEWASSEN[v.gewas];
  // goed verzorgd (steeds snel water) = extra punten
  const punten = Math.round(g.punten * (v.perfect ? 1.5 : 1));
  S.geoogst[v.gewas] = (S.geoogst[v.gewas] ?? 0) + 1;
  zweef(`+${punten}`, v.x + 8, v.y + 2, v.perfect ? KLEUR.y : KLEUR.w);
  stof(v.x + 8, v.y + 7, g.kleur, 8, true);
  if (v.perfect) stof(v.x + 8, v.y + 5, KLEUR.y, 4, true);
  geluid.oogst(v.perfect ? 3 : 1);
  Object.assign(v, { fase: 'leeg', gewas: null, t: 0 });
  punt(punten);
}

function geefWater(v) {
  const snel = v.dorstT < SNEL_WATER;
  if (!snel) v.perfect = false;
  S.combo = S.tijd - S.laatsteWater < COMBO_TIJD ? S.combo + 1 : 1;
  S.laatsteWater = S.tijd;
  const keer = Math.min(S.combo, MAX_COMBO);
  const punten = Math.round((snel ? 5 : 2) * (1 + (keer - 1) * 0.5));
  Object.assign(v, { dorstig: false, dorstT: 0 });
  stof(v.x + 8, v.y + 2, KLEUR.u, 6);
  zweef(`+${punten}`, v.x + 8, v.y + 2, snel ? KLEUR.l : KLEUR.w);
  if (keer > 1) zweef(`x${keer}`, v.x + 8, v.y + 9, KLEUR.o, 0.15);
  geluid.water(keer);
  trilling(10);
  punt(punten);
}

const stadium = (v) => {
  const deel = v.t / v.groei;
  return deel < 0.3 ? 'zaadje' : deel < 0.65 ? 'kiemplant' : 'jong';
};

function punt(n) {
  S.score = Math.max(0, S.score + n);
  while (S.score >= S.volgendHartje) {
    S.volgendHartje += HARTJE_PER;
    if (S.hartjes < MAX_HARTJES) {
      S.hartjes++;
      melding('Extra hartje!');
      geluid.hartje();
    }
  }
  for (const [naam, g] of Object.entries(GEWASSEN)) {
    if (!S.open.has(naam) && S.score >= g.vanaf) {
      S.open.add(naam);
      melding(`Nieuw zaadje: ${g.naam}!`, naam);
    }
  }
  toonStand();
}

function verliesHartje() {
  S.hartjes--;
  S.schud = 0.35;
  geluid.au();
  trilling(80);
  toonStand();
  if (S.hartjes <= 0) eindeSpel();
}

// ---------- Beestjes ----------

function randPunt() {
  const kant = Math.floor(Math.random() * 4);
  if (kant === 0) return { x: -6, y: rnd(0, H) };
  if (kant === 1) return { x: W + 6, y: rnd(0, H) };
  if (kant === 2) return { x: rnd(0, W), y: -6 };
  return { x: rnd(0, W), y: H + 6 };
}

const heeftGewas = (v) => v.fase === 'groeit' || v.fase === 'rijp';

function vrijDoel() {
  const bezet = new Set(S.beestjes.map((b) => b.doel));
  const vrij = S.vakken.filter((v) => heeftGewas(v) && !bezet.has(v.i));
  return vrij.length ? kies(vrij).i : null;
}

function nieuwBeestje() {
  const doel = vrijDoel();
  if (doel === null) return false;
  const soort = S.level >= 2 && Math.random() < 0.35 ? 'slak' : 'luis';
  const p = randPunt();
  S.beestjes.push({ soort, ...p, doel, fase: 'loop', leven: BEESTJES[soort].leven, eet: 0, kant: 1, anim: 0, raak: 0, zij: Math.random() < 0.5 ? -1 : 1 });
  return true;
}

function nieuwLieveheersbeestje() {
  const van = randPunt();
  const naar = { x: W - van.x, y: H - van.y };
  S.beestjes.push({ soort: 'lieveheersbeestje', ...van, naar, fase: 'wandel', leven: 1, kant: 1, anim: 0, raak: 0 });
}

function vlucht(b) {
  b.fase = 'vlucht';
  b.doel = null;
  // wegrennen naar de dichtstbijzijnde rand
  const opties = [
    { x: -10, y: b.y, d: b.x },
    { x: W + 10, y: b.y, d: W - b.x },
    { x: b.x, y: -10, d: b.y },
    { x: b.x, y: H + 10, d: H - b.y },
  ].sort((a, c) => a.d - c.d);
  b.naar = opties[0];
}

function raakBeestje(b) {
  const info = BEESTJES[b.soort];
  if (b.soort === 'lieveheersbeestje') {
    zweef(`${info.punten}`, b.x, b.y - 8, KLEUR.r);
    melding('Au! Lieveheersbeestjes eten luizen, laat ze leven');
    geluid.foei();
    trilling(40);
    vlucht(b);
    punt(info.punten);
    return;
  }
  b.leven--;
  b.raak = 0.15;
  stof(b.x, b.y, KLEUR.g, 3);
  if (b.leven > 0) {
    geluid.tik();
    return;
  }
  S.weggejaagd++;
  zweef(`+${info.punten}`, b.x, b.y - 8, KLEUR.w);
  stof(b.x, b.y, b.soort === 'slak' ? KLEUR.y : KLEUR.g, 6, true);
  geluid.weg();
  trilling(20);
  vlucht(b);
  punt(info.punten);
}

function beweeg(b, doelX, doelY, snelheid, dt) {
  const dx = doelX - b.x;
  const dy = doelY - b.y;
  const afstand = Math.hypot(dx, dy);
  if (afstand < 0.5) return true;
  const stap = Math.min(afstand, snelheid * dt);
  b.x += (dx / afstand) * stap;
  b.y += (dy / afstand) * stap;
  if (Math.abs(dx) > 0.3) b.kant = dx < 0 ? -1 : 1;
  return stap >= afstand;
}

function werkBeestjesBij(dt) {
  const m = moeilijk();
  for (const b of S.beestjes) {
    const info = BEESTJES[b.soort];
    b.anim += dt;
    b.raak = Math.max(0, b.raak - dt);
    if (b.fase === 'loop' || b.fase === 'eet') {
      const v = S.vakken[b.doel];
      if (!heeftGewas(v)) {
        // het gewas is al weg: zoek een ander of ga weg
        const nieuw = vrijDoel();
        if (nieuw === null) vlucht(b);
        else Object.assign(b, { doel: nieuw, fase: 'loop', eet: 0 });
        continue;
      }
      if (b.fase === 'loop') {
        if (beweeg(b, v.x + 8 + b.zij * 4, v.y + 10, info.snelheid * m.snel, dt)) b.fase = 'eet';
      } else {
        b.eet += dt;
        if (Math.random() < dt * 3) stof(v.x + 8, v.y + 7, KLEUR.g, 1);
        if (b.eet >= info.eetTijd * m.eet) {
          Object.assign(v, { fase: 'opgegeten', gewas: null, t: 0 });
          stof(v.x + 8, v.y + 8, KLEUR.G, 8, true);
          zweef('-', v.x + 8, v.y + 3, KLEUR.r);
          vlucht(b);
          b.fase = 'tevreden'; // loopt rustig weg, kan niet meer weggejaagd worden
          verliesHartje();
        }
      }
    } else {
      const snel = b.fase === 'vlucht' ? info.snelheid * 3 : info.snelheid;
      if (beweeg(b, b.naar.x, b.naar.y, snel * m.snel, dt)) b.weg = true;
    }
  }
  S.beestjes = S.beestjes.filter((b) => !b.weg);

  S.beestjeKlok -= dt;
  const plagen = S.beestjes.filter((b) => b.soort !== 'lieveheersbeestje' && (b.fase === 'loop' || b.fase === 'eet'));
  if (S.beestjeKlok <= 0 && plagen.length < m.maxBeestjes) {
    S.beestjeKlok = nieuwBeestje() ? m.beestjeTussen * rnd(0.7, 1.3) : 0.5;
  }
  if (S.level >= 2) {
    S.lieveKlok -= dt;
    if (S.lieveKlok <= 0) {
      nieuwLieveheersbeestje();
      S.lieveKlok = rnd(14, 24);
    }
  }
}

// ---------- Effecten ----------

function stof(x, y, kleur, aantal, omhoog = false) {
  for (let i = 0; i < aantal; i++) {
    S.deeltjes.push({ x, y, vx: rnd(-14, 14), vy: omhoog ? rnd(-26, -10) : rnd(-10, 4), t: rnd(0.3, 0.6), kleur });
  }
}

function zweef(tekst, x, y, kleur, vertraging = 0) {
  S.zwevers.push({ tekst, x: Math.min(W - 6, Math.max(6, x)), y, kleur, t: -vertraging });
}

function trilling(ms) {
  if (!geluid.uit && navigator.vibrate) navigator.vibrate(ms);
}

let meldingKlok = null;
function melding(tekst, sprite) {
  meldingEl.replaceChildren();
  if (sprite) {
    const img = document.createElement('img');
    img.src = plaatjeUrl(sprite);
    img.className = 'sprite';
    img.alt = '';
    meldingEl.append(img);
  }
  meldingEl.append(tekst);
  meldingEl.classList.add('zichtbaar');
  clearTimeout(meldingKlok);
  meldingKlok = setTimeout(() => meldingEl.classList.remove('zichtbaar'), 1800);
}

// ---------- Spelverloop ----------

function werkBij(dt) {
  S.tijd += dt;
  const level = 1 + Math.floor(S.tijd / LEVEL_DUUR);
  if (level !== S.level) {
    S.level = level;
    melding(`Level ${level}! Alles gaat sneller`);
    geluid.level();
    toonStand();
    if (level === 2) setTimeout(() => toestand === 'spelen' && melding('Pas op: slakken! Tik ze 2x'), 2000);
  }

  for (const v of S.vakken) {
    v.wiebel = Math.max(0, v.wiebel - dt);
    v.t += dt;
    if (v.fase === 'groeit' && v.dorstig) {
      v.t -= dt; // zonder water groeit hij niet
      v.dorstT += dt;
      if (v.dorstT >= moeilijk().dorstTijd) {
        Object.assign(v, { fase: 'rot', t: 0, dorstig: false, verwelkt: stadium(v) });
        zweef('-', v.x + 8, v.y + 3, KLEUR.r);
        verliesHartje();
        if (toestand !== 'spelen') return;
      }
    } else if (v.fase === 'groeit' && v.dorsten.length && v.t / v.groei >= v.dorsten[0]) {
      v.dorsten.shift();
      Object.assign(v, { dorstig: true, dorstT: 0 });
    } else if (v.fase === 'groeit' && v.t >= v.groei) Object.assign(v, { fase: 'rijp', t: 0 });
    else if (v.fase === 'rijp' && v.t >= RIJP_TOON) oogst(v);
    else if (v.fase === 'leeg' && v.t >= zaaiPauze(S.level) + v.wacht) {
      v.wacht = 0;
      zaai(v);
    }
    else if (v.fase === 'rot' && v.t >= 3) Object.assign(v, { fase: 'leeg', gewas: null, t: 0 });
    else if (v.fase === 'opgegeten' && v.t >= 1.2) Object.assign(v, { fase: 'leeg', t: 0 });
  }

  werkBeestjesBij(dt);
  if (toestand !== 'spelen') return;

  for (const d of S.deeltjes) {
    d.t -= dt;
    d.vy += 60 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }
  S.deeltjes = S.deeltjes.filter((d) => d.t > 0);
  for (const z of S.zwevers) z.t += dt;
  S.zwevers = S.zwevers.filter((z) => z.t < 0.9);
  S.schud = Math.max(0, S.schud - dt);
}

function tik(x, y) {
  if (toestand !== 'spelen') return;
  geluid.wakker();
  // eerst beestjes: die zitten bovenop
  let raak = null;
  let beste = Infinity;
  for (const b of S.beestjes) {
    if (b.fase === 'vlucht' || b.fase === 'tevreden') continue;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < BEESTJES[b.soort].straal && d < beste) {
      raak = b;
      beste = d;
    }
  }
  // een plaag gaat voor een lieveheersbeestje dat er toevallig naast loopt
  const plaag = S.beestjes.find(
    (b) => b !== raak && b.soort !== 'lieveheersbeestje' && b.fase !== 'vlucht' && b.fase !== 'tevreden' && Math.hypot(b.x - x, b.y - y) < BEESTJES[b.soort].straal,
  );
  if (raak?.soort === 'lieveheersbeestje' && plaag) raak = plaag;
  if (raak) return raakBeestje(raak);

  const v = S.vakken.find((v) => x >= v.x - 1 && x < v.x + VAK + 1 && y >= v.y - 1 && y < v.y + VAK + 1);
  if (!v) return;
  if (v.fase === 'groeit' && v.dorstig) geefWater(v);
  else if (v.fase === 'groeit') {
    v.wiebel = 0.2;
    geluid.nee();
  }
}

// ---------- Tekenen ----------

function teken() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (S.schud > 0) ctx.translate(Math.round(rnd(-1, 1)), Math.round(rnd(-1, 1)));
  ctx.drawImage(gras, 0, 0);
  const knipper = Math.floor(S.tijd * 6) % 2 === 0;

  for (const v of S.vakken) {
    ctx.drawImage(grond, v.x, v.y);
    if (v.fase === 'opgegeten' || v.fase === 'rot') {
      ctx.fillStyle = KLEUR.B;
      ctx.fillRect(v.x + 4, v.y + 9, 8, 3);
    }
    const dx = v.wiebel > 0 ? (Math.floor(v.wiebel * 40) % 2 ? 1 : -1) : 0;
    const sx = v.x + 3 + dx;
    const sy = v.y + 2;
    if (v.fase === 'groeit') {
      const deel = v.t / v.groei;
      if (v.dorstig) {
        // slap plantje met een knipperende druppel erboven
        const over = 1 - v.dorstT / moeilijk().dorstTijd;
        ctx.drawImage(plaatje(stadium(v), { rot: over < 0.5 && knipper }), sx, sy + 1);
        if (over > 0.4 || knipper) ctx.drawImage(plaatje('druppel'), v.x + 11, v.y - 1 + (knipper ? 0 : 1));
        balk(v, over, KLEUR.u);
      } else {
        ctx.drawImage(plaatje(stadium(v)), sx, sy);
        balk(v, deel, KLEUR.l);
      }
    } else if (v.fase === 'rijp') {
      const hup = v.t < RIJP_TOON / 2 ? -1 : -2;
      ctx.drawImage(plaatje(v.gewas), sx, sy + hup);
      if (v.perfect) ctx.drawImage(plaatje(knipper ? 'glinster' : 'glinsterKlein'), v.x + 11, v.y - 1);
    } else if (v.fase === 'rot') {
      ctx.drawImage(plaatje(v.verwelkt ?? v.gewas, { rot: true }), sx, sy + 1);
      // vliegje
      const a = S.tijd * 7 + v.i;
      ctx.fillStyle = KLEUR.k;
      ctx.fillRect(Math.round(v.x + 8 + Math.cos(a) * 5), Math.round(v.y + 4 + Math.sin(a * 1.3) * 2), 1, 1);
    }
  }

  for (const b of S.beestjes) {
    const img = plaatje(b.soort);
    const stapje = b.fase === 'eet' ? 0 : Math.floor(b.anim * 8) % 2;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y - stapje));
    if (b.raak > 0) ctx.translate(knipper ? 1 : -1, 0);
    if (b.kant < 0 && b.soort !== 'lieveheersbeestje') ctx.scale(-1, 1);
    ctx.drawImage(img, -5, -5);
    ctx.restore();
    if (b.fase === 'eet') {
      const v = S.vakken[b.doel];
      const deel = b.eet / (BEESTJES[b.soort].eetTijd * moeilijk().eet);
      ctx.fillStyle = KLEUR.k;
      ctx.fillRect(v.x + 2, v.y, VAK - 4, 2);
      ctx.fillStyle = KLEUR.r;
      ctx.fillRect(v.x + 3, v.y, Math.ceil((VAK - 6) * deel), 1);
    }
    if (b.fase === 'vlucht' && b.soort !== 'lieveheersbeestje') tekenTekst(ctx, '!', b.x, b.y - 12, KLEUR.y);
  }

  for (const d of S.deeltjes) {
    ctx.fillStyle = d.kleur;
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  }
  for (const z of S.zwevers) {
    if (z.t < 0) continue;
    tekenTekst(ctx, z.tekst, z.x, z.y - z.t * 10, z.kleur);
  }
}

function balk(v, deel, kleur) {
  const breed = VAK - 6;
  ctx.fillStyle = KLEUR.k;
  ctx.fillRect(v.x + 2, v.y + 13, breed + 2, 2);
  ctx.fillStyle = kleur;
  ctx.fillRect(v.x + 3, v.y + 13, Math.max(1, Math.round(breed * Math.min(1, deel))), 1);
}

// ---------- Scherm en invoer ----------

function pasGrootteAan() {
  const ruimte = $('speelveld').getBoundingClientRect();
  const rand = 12; // kaderrand en schaduw
  const schaal = Math.max(1, Math.min((ruimte.width - rand) / W, (ruimte.height - rand) / H));
  bord.style.width = `${Math.floor(W * schaal)}px`;
  bord.style.height = `${Math.floor(H * schaal)}px`;
}
new ResizeObserver(pasGrootteAan).observe($('speelveld'));

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  tik(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
});

let vorige = 0;
function lus(nu) {
  const dt = Math.min(0.05, (nu - vorige) / 1000 || 0);
  vorige = nu;
  if (toestand === 'spelen') werkBij(dt);
  if (S) teken();
  requestAnimationFrame(lus);
}

function toonStand() {
  scoreEl.textContent = S.score;
  levelEl.textContent = `Level ${S.level}`;
  hartjesEl.replaceChildren();
  for (let i = 0; i < Math.max(3, S.hartjes); i++) {
    const img = document.createElement('img');
    img.src = hartUrl;
    img.className = `sprite${i < S.hartjes ? '' : ' leeg'}`;
    img.alt = '';
    hartjesEl.append(img);
  }
  hartjesEl.setAttribute('aria-label', `${S.hartjes} hartjes`);
}

function toon(naam) {
  for (const [n, el] of Object.entries(schermen)) el.hidden = n !== naam;
  document.body.classList.toggle('speelt', naam === null);
}

function start() {
  geluid.wakker();
  nieuwSpel();
  toonStand();
  toestand = 'spelen';
  toon(null);
  melding('Druppel? Tik het plantje om water te geven!', 'gieter');
}

function pauzeer() {
  if (toestand !== 'spelen') return;
  toestand = 'pauze';
  toon('pauze');
}

function hervat() {
  if (toestand !== 'pauze') return;
  toestand = 'spelen';
  toon(null);
}

function eindeSpel() {
  toestand = 'einde';
  geluid.einde();
  const scores = lees('spel.scores', []);
  const oudRecord = lees('spel.highscore', 0) ?? 0;
  const nieuwRecord = S.score > oudRecord;
  if (nieuwRecord) bewaar('spel.highscore', S.score);
  scores.push({ score: S.score, datum: new Date().toISOString().slice(0, 10) });
  scores.sort((a, b) => b.score - a.score);
  bewaar('spel.scores', scores.slice(0, 5));

  $('eindScore').textContent = S.score;
  $('eindTitel').textContent = nieuwRecord && S.score > 0 ? 'Nieuw record!' : 'Oogst voorbij';
  $('eindTekst').textContent = nieuwRecord && S.score > 0 ? 'Wauw Jetske, dat is je beste ooit!' : `Je record is ${oudRecord}. Nog een keer?`;
  const oogst = $('eindOogst');
  oogst.replaceChildren();
  const lijst = Object.entries(S.geoogst).sort((a, b) => b[1] - a[1]);
  for (const [naam, aantal] of lijst) {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = plaatjeUrl(naam);
    img.className = 'sprite';
    img.alt = '';
    li.append(img, `${aantal} ${aantal === 1 ? GEWASSEN[naam].naam.toLowerCase() : GEWASSEN[naam].meer}`);
    oogst.append(li);
  }
  if (S.weggejaagd) {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = plaatjeUrl('luis');
    img.className = 'sprite';
    img.alt = '';
    li.append(img, `${S.weggejaagd} beestjes weggejaagd`);
    oogst.append(li);
  }
  if (!lijst.length && !S.weggejaagd) oogst.append(Object.assign(document.createElement('li'), { textContent: 'Nog niks geoogst' }));
  toonRecords();
  setTimeout(() => toestand === 'einde' && toon('einde'), 700);
}

function toonRecords() {
  const record = lees('spel.highscore', 0) ?? 0;
  recordEl.textContent = `Record ${record}`;
  const scores = lees('spel.scores', []);
  for (const id of ['startScores', 'eindScores']) {
    const ol = $(id);
    ol.replaceChildren();
    scores.forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${Number(s.score)}</span><span>${String(s.datum).split('-').reverse().slice(0, 2).join('-')}</span>`;
      ol.append(li);
    });
    ol.closest('.records').hidden = scores.length === 0;
  }
}

const hartUrl = plaatjeUrl('hartje');

$('startKnop').addEventListener('click', start);
$('opnieuwKnop').addEventListener('click', start);
$('verderKnop').addEventListener('click', hervat);
$('stopKnop').addEventListener('click', () => {
  toestand = 'einde';
  eindeSpel();
});
$('pauzeKnop').addEventListener('click', () => (toestand === 'pauze' ? hervat() : pauzeer()));
const geluidKnop = $('geluidKnop');
const zetGeluidKnop = () => {
  geluidKnop.textContent = geluid.uit ? 'Geluid uit' : 'Geluid aan';
  geluidKnop.setAttribute('aria-pressed', String(!geluid.uit));
};
geluidKnop.addEventListener('click', () => {
  geluid.zet(!geluid.uit);
  zetGeluidKnop();
});
document.addEventListener('visibilitychange', () => document.hidden && pauzeer());

// Uitleg op het startscherm met de echte plaatjes
for (const img of document.querySelectorAll('img[data-sprite]')) img.src = plaatjeUrl(img.dataset.sprite);

zetGeluidKnop();
nieuwSpel();
toonStand();
toonRecords();
toon('start');
pasGrootteAan();
requestAnimationFrame(lus);
