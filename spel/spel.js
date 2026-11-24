// Tuinieren: zaai, oogst snel voordat het rot, en jaag de beestjes weg.
import { lees, bewaar } from '../shared/opslag.js';
import { plaatje, plaatjeUrl, katPlaatje, maakGrond, maakGras, tekenTekst, KLEUR } from './spel-sprites.js';
import { geluid } from './spel-geluid.js';
import { bewaarOogst, eigenKatten, KATTEN, GEWAS_NAMEN } from './spel-markt.js';
import { FRENZY, maakFrenzy, werkFrenzyBij, tekenFrenzy, pluk, plukOver } from './spel-frenzy.js';
import { WEER_SOORTEN, maakWeer, wisselWeer, werkWeerBij, slaInBij, windKracht, tekenWeerVeld, tekenLucht } from './spel-weer.js';
import { haalTop, stuurScore, vulLijst, laatsteNaam, bewaarNaam } from '../shared/highscore.js';

// ---------- Instellingen ----------

// Het veld in 'echte' pixels; de browser vergroot het scherp.
const VAK = 16;
const TUSSEN = 2;
const MARGE = 4;
const KOLOMMEN = 3;
const RIJEN = 3;
const W = MARGE * 2 + KOLOMMEN * VAK + (KOLOMMEN - 1) * TUSSEN; // 60
const H = MARGE * 2 + RIJEN * VAK + (RIJEN - 1) * TUSSEN; // 60

// groeitijd en hoelang hij rijp blijft, in seconden
const GEWASSEN = {
  // graan is de basis: je begint ermee, het komt het vaakst, groeit snel en is weinig waard.
  // De andere gewassen komen er pas bij als je wat punten hebt.
  graan: { naam: 'Graan', meer: 'graan', groei: 2.2, rijp: 3.5, punten: 5, vanaf: 0, kans: 8, kleur: KLEUR.y },
  radijs: { naam: 'Radijs', meer: 'radijsjes', groei: 3, rijp: 3.2, punten: 10, vanaf: 40, kans: 3, kleur: KLEUR.r },
  wortel: { naam: 'Wortel', meer: 'wortels', groei: 4.5, rijp: 3.6, punten: 20, vanaf: 100, kans: 3, kleur: KLEUR.o },
  tomaat: { naam: 'Tomaat', meer: 'tomaten', groei: 6, rijp: 4, punten: 35, vanaf: 250, kans: 2, kleur: KLEUR.r },
  aardbei: { naam: 'Aardbei', meer: 'aardbeien', groei: 5, rijp: 2.6, punten: 45, vanaf: 600, kans: 2, kleur: KLEUR.r },
  pompoen: { naam: 'Pompoen', meer: 'pompoenen', groei: 9, rijp: 5, punten: 90, vanaf: 1200, kans: 1, kleur: KLEUR.o },
};

const BEESTJES = {
  luis: { snelheid: 9, leven: 1, eetTijd: 3.5, punten: 5, straal: 6 },
  slak: { snelheid: 3.5, leven: 2, eetTijd: 4.5, punten: 10, straal: 6 },
  lieveheersbeestje: { snelheid: 9, leven: 1, punten: -25, straal: 4 },
};

// Zaaien en oogsten gaan vanzelf; de speler geeft water en jaagt beestjes weg.
const DORST_TIJD = 6; // zo lang kan een plantje zonder water
const SNEL_WATER = 1; // binnen zoveel seconden water geven = extra punten
// zo lang blijft een vakje leeg voordat er vanzelf gezaaid wordt: rustig in level 1, daarna sneller
const zaaiPauze = (level) => Math.max(1, 4 - 0.6 * (level - 1));
const START_TUSSEN = 4; // aan het begin komt er om de zoveel seconden een plantje bij
const VERS_TIJD = 1; // binnen zoveel seconden na rijp oogsten = vers, extra punten

const LEVEL_DUUR = 45; // seconden per level
const COMBO_TIJD = 1.2;
const MAX_COMBO = 5; // x1, x1.5 ... x3
const MAX_HARTJES = 5;
const HARTJE_PER = 1500; // extra hartje per zoveel punten

// Vlierbes frenzy: na een minuut spelen, en daarna om de paar minuten opnieuw.
// Om alleen de frenzy te testen: spel/?frenzy=1 start hem 2 seconden na Start, en daarna elke 20 seconden.
const TEST_FRENZY = new URLSearchParams(location.search).get('frenzy') === '1';
const FRENZY_NA = TEST_FRENZY ? 2 : 60; // seconden spelen tot de eerste frenzy
const FRENZY_ELKE = TEST_FRENZY ? 20 : 180; // daarna weer na zoveel seconden gewoon spelen
const PLUK_COMBO_TIJD = 0.5;

// Het weer wisselt na een tijdje tussen zon, regen en storm. Alle tijden zijn seconden gewoon spelen:
// tijdens de vlierbes frenzy (en de pauze) staat het weer stil.
//   zon:   alles gewoon.
//   regen: dorstige plantjes krijgen vanzelf water (en te veel water geven kan niet), maar er komen meer slakken.
//   storm: ook regen, plus wind: rijpe oogst blijft korter goed en de bliksem slaat in op een vakje.
//          Het vakje knippert eerst geel: oogst snel, want wat er dan nog staat is weg (geen hartje kwijt).
// Om te testen: spel/?weer=regen, ?weer=storm of ?weer=zon begint met dat weer en houdt het vast.
const WEER = {
  eersteZon: 25, // zo lang schijnt aan het begin de zon
  duur: { zon: [20, 30], regen: [15, 22], storm: [10, 15] }, // zo lang duurt elk weer (van, tot)
  kans: { zon: 3, regen: 3, storm: 2 }, // hoe vaak elk weer komt als het wisselt
  stormVanaf: 2, // storm pas vanaf dit level
  overgang: 2, // in zoveel seconden trekt het nieuwe weer erover
  regenWater: 0.8, // bij regen en storm krijgt een dorstig plantje na zoveel seconden vanzelf water
  slak: 0.35, // kans op een slak in plaats van een luis (vanaf level 2)...
  regenSlak: 0.65, // ...en als het regent of stormt
  stormRijp: 0.65, // bij storm blijft rijpe oogst maar zo lang goed (keer de gewone tijd)
  bliksemElke: [3.5, 6], // bij storm slaat om de zoveel seconden de bliksem in
  bliksemWaarschuwing: 1.6, // zo lang knippert het vakje voordat de bliksem inslaat
};
const TEST_WEER = Object.keys(WEER_SOORTEN).find((w) => w === new URLSearchParams(location.search).get('weer'));
const WEER_MELDING = {
  zon: 'De zon schijnt weer!',
  regen: 'Het regent! Je plantjes krijgen vanzelf water',
  storm: 'Storm! Oogst snel, de bliksem kan inslaan',
};

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
    hartjes: 5,
    volgendHartje: HARTJE_PER,
    level: 1,
    tijd: 0,
    combo: 0,
    laatsteWater: -9,
    beestjeKlok: 12,
    lieveKlok: 15,
    kat: null,
    teVeelUitgelegd: false,
    katKlok: 5,
    katten: eigenKatten(), // alleen gekochte katten lopen langs
    volgendeKat: 0,
    katStof: [],
    schat: null,
    plasje: null,
    open: new Set(Object.keys(GEWASSEN).filter((g) => GEWASSEN[g].vanaf === 0)),
    geoogst: {},
    weggejaagd: 0,
    schud: 0,
    frenzy: null, // de vlierbes frenzy, als die bezig is
    volgendeFrenzy: FRENZY_NA, // op deze speeltijd (S.tijd) begint de volgende
    frenzyTijd: 0, // tijd in frenzy's; S.tijd staat dan stil
    plukCombo: 0,
    laatstePluk: -9,
    weer: maakWeer(TEST_WEER ?? 'zon', W, KAT_H),
    weerKlok: TEST_WEER ? Infinity : WEER.eersteZon, // over zoveel seconden wisselt het weer
    bliksemKlok: 2,
    bliksemUitgelegd: false,
  };
}

const moeilijk = () => {
  const l = S.level - 1;
  return {
    // level 1 is extra rustig: alles groeit langzamer en blijft langer rijp
    // en daarna wordt het per level maar een klein beetje moeilijker
    groei: Math.max(0.6, 1.5 - 0.08 * l),
    rijp: Math.max(0.6, 1.7 - 0.1 * l),
    beestjeTussen: Math.max(1.3, 6 - 0.7 * l),
    maxBeestjes: Math.min(2 + Math.floor(l / 2), 6),
    snel: 1.1 + 0.06 * l,
    eet: Math.max(0.5, 0.85 - 0.05 * l),
    dorstTijd: Math.max(3.5, DORST_TIJD - 0.4 * l),
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
  // elk plantje heeft al vroeg dorst en daarna nog eens; trage gewassen en hogere levels vaker
  let keren = g.groei > 5.5 ? 3 : 2;
  if (S.level >= 3 && Math.random() < 0.5) keren++;
  const eerste = rnd(0.08, 0.2);
  const dorsten = Array.from({ length: keren }, (_, k) => eerste + (k * (0.85 - eerste)) / (keren - 1) + (k ? rnd(-0.05, 0.05) : 0));
  Object.assign(v, { fase: 'groeit', gewas: naam, t: 0, groei, rijp: g.rijp * m.rijp, dorsten, perfect: true, dorstig: false, dorstT: 0, verwelkt: null, teVeel: 0, laatsteWater: -9 });
  stof(v.x + 8, v.y + 12, KLEUR.b, 3);
  geluid.zaai();
}

function oogst(v) {
  const g = GEWASSEN[v.gewas];
  // goed verzorgd (steeds snel water) en vers geoogst = extra punten
  const vers = v.t < VERS_TIJD;
  const punten = Math.round(g.punten * (v.perfect ? 1.5 : 1) * (vers ? 1.5 : 1));
  const goud = v.perfect || vers;
  S.geoogst[v.gewas] = (S.geoogst[v.gewas] ?? 0) + 1;
  bewaarOogst(v.gewas); // voor de markt
  zweef(`+${punten}`, v.x + 8, v.y + 2, goud ? KLEUR.y : KLEUR.w);
  stof(v.x + 8, v.y + 7, g.kleur, 8, true);
  if (goud) stof(v.x + 8, v.y + 5, KLEUR.y, 4, true);
  geluid.oogst(v.perfect && vers ? 5 : goud ? 3 : 1);
  trilling(10);
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
  Object.assign(v, { dorstig: false, dorstT: 0, laatsteWater: S.tijd });
  stof(v.x + 8, v.y + 2, KLEUR.u, 6);
  zweef(`+${punten}`, v.x + 8, v.y + 2, snel ? KLEUR.l : KLEUR.w);
  if (keer > 1) zweef(`x${keer}`, v.x + 8, v.y + 9, KLEUR.o, 0.15);
  geluid.water(keer);
  trilling(10);
  punt(punten);
}

// Water geven terwijl het plantje geen dorst heeft = te veel water.
// De eerste keer wordt het bruin (met uitleg), de tweede keer gaat het dood.
function teVeelWater(v) {
  if (S.tijd - v.laatsteWater < 0.5) return; // per ongeluk dubbel getikt: niet meetellen
  v.laatsteWater = S.tijd;
  v.teVeel++;
  v.perfect = false;
  stof(v.x + 8, v.y + 4, KLEUR.u, 4);
  if (v.teVeel >= 2) {
    Object.assign(v, { fase: 'rot', t: 0, dorstig: false, verwelkt: stadium(v) });
    zweef('-', v.x + 8, v.y + 3, KLEUR.r);
    melding('Verzopen! Te veel water kost een hartje', 'druppel');
    verliesHartje();
    return;
  }
  v.wiebel = 0.3;
  zweef('!', v.x + 8, v.y + 2, KLEUR.o);
  geluid.nee();
  trilling(30);
  melding(S.teVeelUitgelegd ? 'Te veel water! Nog een keer en hij gaat dood' : 'Oei, te veel water! Alleen water geven als er een druppel is', 'druppel');
  S.teVeelUitgelegd = true;
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
  const soort = S.level >= 2 && Math.random() < (regent() ? WEER.regenSlak : WEER.slak) ? 'slak' : 'luis';
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
  meldingEl.append(Object.assign(document.createElement('span'), { textContent: tekst }));
  meldingEl.classList.add('zichtbaar');
  clearTimeout(meldingKlok);
  meldingKlok = setTimeout(() => meldingEl.classList.remove('zichtbaar'), 1800);
}

// ---------- Spelverloop ----------

function werkBij(dt) {
  S.tijd += dt;
  werkWeer(dt);
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
    if (v.fase === 'rijp' && S.weer.nu === 'storm') v.t += dt * (1 / WEER.stormRijp - 1); // de storm laat rijpe oogst sneller bederven
    if (v.fase === 'groeit' && v.dorstig) {
      v.t -= dt; // zonder water groeit hij niet
      v.dorstT += dt;
      if (regent() && v.dorstT >= WEER.regenWater) {
        // de regen geeft hem water; geen punten, maar ook geen straf
        Object.assign(v, { dorstig: false, dorstT: 0, laatsteWater: S.tijd });
        stof(v.x + 8, v.y + 4, KLEUR.l, 4);
      } else if (v.dorstT >= moeilijk().dorstTijd) {
        Object.assign(v, { fase: 'rot', t: 0, dorstig: false, verwelkt: stadium(v) });
        zweef('-', v.x + 8, v.y + 3, KLEUR.r);
        verliesHartje();
        if (toestand !== 'spelen') return;
      }
    } else if (v.fase === 'groeit' && v.dorsten.length && v.t / v.groei >= v.dorsten[0]) {
      v.dorsten.shift();
      Object.assign(v, { dorstig: true, dorstT: 0 });
    } else if (v.fase === 'groeit' && v.t >= v.groei) Object.assign(v, { fase: 'rijp', t: 0 });
    else if (v.fase === 'rijp' && v.t >= v.rijp) {
      // te laat geoogst: hij rot
      Object.assign(v, { fase: 'rot', t: 0, verwelkt: null });
      zweef('-', v.x + 8, v.y + 3, KLEUR.r);
      verliesHartje();
      if (toestand !== 'spelen') return;
    }
    else if (v.fase === 'leeg' && v.t >= zaaiPauze(S.level) + v.wacht && S.weer.bliksem?.vak !== v.i) {
      v.wacht = 0;
      zaai(v);
    }
    else if (v.fase === 'rot' && v.t >= 3) Object.assign(v, { fase: 'leeg', gewas: null, t: 0 });
    else if (v.fase === 'opgegeten' && v.t >= 1.2) Object.assign(v, { fase: 'leeg', t: 0 });
  }

  werkBeestjesBij(dt);
  if (toestand !== 'spelen') return;
  werkEffectenBij(dt);
}

function werkEffectenBij(dt) {
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
  if (S.frenzy) return plukBij(x, y, FRENZY.straalTik);
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
  else if (v.fase === 'rijp') oogst(v);
  else if (v.fase === 'rot') {
    stof(v.x + 8, v.y + 9, KLEUR.x, 6);
    Object.assign(v, { fase: 'leeg', gewas: null, t: 0 });
    geluid.opruimen();
  }
  else if (v.fase === 'groeit' && !regent()) teVeelWater(v); // als het regent is het toch al nat
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
    // wiebelen na te veel water, en wuiven in de storm
    const zwaai = Math.round(Math.sin(S.tijd * 7 + v.i * 1.7) * windKracht(S.weer));
    const dx = v.wiebel > 0 ? (Math.floor(v.wiebel * 40) % 2 ? 1 : -1) : zwaai;
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
        // bruin na te veel water
        ctx.drawImage(plaatje(stadium(v), { bruin: v.teVeel > 0 }), sx, sy);
        balk(v, deel, KLEUR.l);
      }
    } else if (v.fase === 'rijp') {
      const over = 1 - v.t / v.rijp;
      const hup = Math.sin(S.tijd * 10 + v.i) > 0 ? -1 : 0;
      const img = plaatje(v.gewas);
      const groter = (img.width - 10) / 2; // het graan is 14x14: iets naar linksboven, zodat het in het vakje past
      ctx.drawImage(img, sx - groter, sy + hup - groter * 2);
      const kleur = over > 0.6 ? KLEUR.g : over > 0.3 ? KLEUR.y : KLEUR.r;
      if (over > 0.3 || knipper) balk(v, over, kleur);
      if (v.t < VERS_TIJD || v.perfect) ctx.drawImage(plaatje(knipper ? 'glinster' : 'glinsterKlein'), v.x + 11, v.y - 1);
    } else if (v.fase === 'rot') {
      const img = plaatje(v.verwelkt ?? v.gewas, { rot: true });
      const groter = (img.width - 10) / 2;
      ctx.drawImage(img, sx - groter, sy + 1 - groter * 2);
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

  if (S.frenzy) tekenFrenzy(ctx, S.frenzy, W, H, S.tijd + S.frenzyTijd);
  else tekenWeerVeld(ctx, S.weer, H, S.tijd, VAK); // tijdens de frenzy staat het weer stil

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
  const meldingRij = 64;
  const schaal = Math.max(1, Math.min((ruimte.width - rand) / W, (ruimte.height - rand - meldingRij) / (H + KAT_H)));
  bord.style.width = `${Math.floor(W * schaal)}px`;
  bord.style.height = `${Math.floor(H * schaal)}px`;
  kattenpad.style.width = `${Math.floor(W * schaal) + 8}px`;
  kattenpad.style.height = `${Math.floor(KAT_H * schaal)}px`;
  meldingEl.parentElement.style.width = `${Math.floor(W * schaal) + 8}px`;
}
new ResizeObserver(pasGrootteAan).observe($('speelveld'));

const veldPunt = (e) => {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
};
let veegt = false;
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  veegt = true;
  tik(...veldPunt(e));
});
// Tijdens de frenzy pluk je ook door over de trosjes te vegen
canvas.addEventListener('pointermove', (e) => {
  if (!veegt || !S.frenzy || toestand !== 'spelen') return;
  for (const ev of e.getCoalescedEvents?.() ?? [e]) plukBij(...veldPunt(ev), FRENZY.straalVeeg);
});
for (const soort of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(soort, () => (veegt = false));

// ---------- Vlierbes frenzy ----------

const frenzyBalk = $('frenzyBalk');
const frenzyKlok = $('frenzyKlok');

function startFrenzy() {
  S.frenzy = maakFrenzy(W, H);
  S.plukCombo = 0;
  veegt = false;
  document.body.classList.add('frenzy');
  frenzyBalk.hidden = false;
  frenzyKlok.style.width = '100%';
  melding('Vlierbes frenzy! Tik en veeg over de trosjes', 'vlierbes');
  geluid.frenzy();
  trilling(120);
}

function werkFrenzy(dt) {
  S.frenzyTijd += dt;
  const bezig = werkFrenzyBij(S.frenzy, dt);
  werkEffectenBij(dt);
  frenzyKlok.style.width = `${Math.round(plukOver(S.frenzy) * 100)}%`;
  document.body.classList.toggle('frenzy-groeit', S.frenzy.fase === 'groei');
  if (!bezig) stopFrenzy();
}

function stopFrenzy() {
  const n = S.frenzy.geplukt;
  S.frenzy = null;
  S.volgendeFrenzy = S.tijd + FRENZY_ELKE;
  document.body.classList.remove('frenzy', 'frenzy-groeit');
  frenzyBalk.hidden = true;
  melding(n ? `${n} vlierbessen geplukt! Verder met de tuin` : 'De vlierbessen zijn weg. Verder met de tuin', 'vlierbes');
  geluid.level();
}

/** Plukt alle rijpe trosjes rond (x, y): 1 punt per besje, en alles gaat in je voorraad. */
function plukBij(x, y, straal) {
  const raak = pluk(S.frenzy, x, y, straal);
  if (!raak.length) return;
  const aantal = raak.reduce((som, t) => som + t.n, 0);
  S.plukCombo = S.frenzyTijd - S.laatstePluk < PLUK_COMBO_TIJD ? S.plukCombo + 1 : 1;
  S.laatstePluk = S.frenzyTijd;
  S.geoogst.vlierbes = (S.geoogst.vlierbes ?? 0) + aantal;
  bewaarOogst('vlierbes', aantal);
  for (const t of raak) stof(t.x, t.y, KLEUR.P, 3, true);
  zweef(`+${aantal}`, x, y - 3, raak.length > 1 ? KLEUR.y : KLEUR.w);
  geluid.pluk(S.plukCombo);
  trilling(8);
  punt(aantal);
}

// ---------- Het weer ----------

const weerEl = $('weer');
const regent = () => S.weer.nu !== 'zon';

function toonWeer(nieuw = false) {
  const soort = WEER_SOORTEN[S.weer.nu];
  weerEl.querySelector('img').src = plaatjeUrl(soort.sprite);
  weerEl.setAttribute('aria-label', `Weer: ${soort.naam}`);
  weerEl.title = soort.naam;
  if (nieuw) {
    weerEl.classList.remove('nieuw');
    void weerEl.offsetWidth; // animatie opnieuw starten
    weerEl.classList.add('nieuw');
  }
}

function werkWeer(dt) {
  const w = S.weer;
  S.weerKlok -= dt;
  if (S.weerKlok <= 0) {
    const opties = [];
    for (const [soort, n] of Object.entries(WEER.kans)) {
      if (soort === w.nu || (soort === 'storm' && S.level < WEER.stormVanaf)) continue;
      for (let i = 0; i < n; i++) opties.push(soort);
    }
    const nieuw = kies(opties);
    wisselWeer(w, nieuw);
    S.weerKlok = rnd(...WEER.duur[nieuw]);
    S.bliksemKlok = WEER.overgang + rnd(1, 2.5);
    melding(WEER_MELDING[nieuw], WEER_SOORTEN[nieuw].sprite);
    geluid.weer(nieuw);
    toonWeer(true);
  }
  werkWeerBij(w, dt, H, WEER.overgang);

  // Bliksem: eerst knippert een vakje met een plantje, daarna slaat hij in
  if (w.nu !== 'storm') w.bliksem = null;
  else if (w.bliksem) {
    w.bliksem.t += dt;
    if (w.bliksem.t >= WEER.bliksemWaarschuwing) slaIn();
  } else if ((S.bliksemKlok -= dt) <= 0) {
    const doelen = S.vakken.filter(heeftGewas);
    if (doelen.length) {
      const v = kies(doelen);
      w.bliksem = { vak: v.i, x: v.x + VAK / 2, y: v.y + VAK / 2, t: 0 };
      geluid.rommel();
    }
    S.bliksemKlok = doelen.length ? rnd(...WEER.bliksemElke) : 0.5;
  }
}

function slaIn() {
  const w = S.weer;
  const { vak, x, y } = w.bliksem;
  const v = S.vakken[vak];
  w.bliksem = null;
  slaInBij(w, x, y);
  geluid.donder();
  trilling(150);
  S.schud = 0.3;
  if (heeftGewas(v)) {
    Object.assign(v, { fase: 'opgegeten', gewas: null, t: 0, dorstig: false });
    stof(x, y, KLEUR.y, 6, true);
    stof(x, y + 2, KLEUR.k, 6, true);
    zweef('-', x, v.y + 3, KLEUR.r);
    if (!S.bliksemUitgelegd) melding('Bliksem! Oogst snel als een vakje geel knippert', 'weerStorm');
    S.bliksemUitgelegd = true;
  } else zweef('!', x, v.y + 3, KLEUR.y); // net op tijd geoogst
  // beestjes in de buurt schrikken en rennen weg
  for (const b of S.beestjes) {
    if (b.fase !== 'vlucht' && b.fase !== 'tevreden' && Math.hypot(b.x - x, b.y - y) < 14) vlucht(b);
  }
}

// ---------- De katten op de schutting ----------
// Twee katten (zwart-wit en cyperse) lopen om de beurt boven de tuin langs, nooit over het speelveld.
// Elke keer doet de kat maar één ding: zitten, springen, plassen of graven naar een schat.
// Tik op de kat voor een miauw; tik op een opgegraven schat voor extra punten.

const KAT_H = 20;
const KAT_Y = 6; // bovenkant van de kat; hij staat op de schutting
const SCHUTTING_Y = 14;
const kattenpad = $('kattenpad');
const kctx = kattenpad.getContext('2d');
kattenpad.width = W;
kattenpad.height = KAT_H;
const schutting = (() => {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = KAT_H;
  const k = c.getContext('2d');
  k.fillStyle = KLEUR.l;
  k.fillRect(0, 0, W, KAT_H);
  k.fillStyle = KLEUR.b;
  k.fillRect(0, SCHUTTING_Y, W, KAT_H - SCHUTTING_Y);
  k.fillStyle = KLEUR.B;
  k.fillRect(0, SCHUTTING_Y, W, 1);
  for (let x = 3; x < W; x += 5) k.fillRect(x, SCHUTTING_Y + 1, 1, KAT_H - SCHUTTING_Y - 1);
  k.fillRect(0, SCHUTTING_Y + 3, W, 1);
  return c;
})();

const KAT_ACTIES = ['zit', 'spring', 'plas', 'graaf'];
const ACTIE_DUUR = { zit: 2.5, spring: 0.7, plas: 2, graaf: 2.2 };
const SCHAT_PUNTEN = 15;
// om te testen: spel/?katactie=graaf laat de kat altijd graven
const TEST_ACTIE = KAT_ACTIES.find((a) => a === new URLSearchParams(location.search).get('katactie'));

function werkKatBij(dt) {
  if (S.schat) {
    S.schat.t += dt;
    if (S.schat.t > 5 || S.schat.gepakt > 0.8) S.schat = null;
    else if (S.schat.gepakt) S.schat.gepakt += dt;
  }
  if (S.plasje) {
    S.plasje.t += dt;
    if (S.plasje.t > 6) S.plasje = null;
  }
  const kat = S.kat;
  if (!kat) {
    S.katKlok -= dt;
    if (S.katKlok <= 0 && !S.katten.length) S.katKlok = 10; // nog geen kat gekocht op de markt
    else if (S.katKlok <= 0) {
      const kant = Math.random() < 0.5 ? 1 : -1;
      // de gekochte katten komen om de beurt langs
      const soort = S.katten[S.volgendeKat++ % S.katten.length];
      melding(`${KATTEN[soort].naam} komt langs!`);
      S.kat = {
        soort,
        x: kant > 0 ? -12 : W,
        y: 0,
        kant,
        fase: 'loop',
        t: 0,
        hartje: 0,
        actie: TEST_ACTIE ?? kies(KAT_ACTIES),
        actieOp: rnd(10, W - 22),
      };
    }
    return;
  }
  kat.t += dt;
  kat.hartje = Math.max(0, kat.hartje - dt);

  if (kat.fase === 'actie') {
    const duur = ACTIE_DUUR[kat.actie];
    if (kat.actie === 'spring') {
      kat.x += kat.kant * 16 * dt;
      kat.y = -Math.round(Math.sin(Math.min(1, kat.t / duur) * Math.PI) * 6);
    }
    if (kat.actie === 'graaf' && Math.random() < dt * 12) {
      const voor = kat.x + (kat.kant > 0 ? 10 : 2);
      S.katStof.push({ x: voor, y: SCHUTTING_Y - 1, vx: -kat.kant * rnd(4, 14), vy: rnd(-18, -8), t: 0.5 });
    }
    if (kat.t >= duur) {
      if (kat.actie === 'graaf') {
        const x = kat.x + (kat.kant > 0 ? 13 : -4);
        S.schat = { x: Math.min(W - 6, Math.max(1, x)), soort: Math.random() < 0.5 ? 'muntje' : 'botje', t: 0, gepakt: 0 };
        geluid.hartje();
      }
      Object.assign(kat, { fase: 'loop', t: 0, y: 0, actie: null });
    }
  } else {
    kat.x += kat.kant * 9 * dt;
    if (kat.actie && Math.abs(kat.x - kat.actieOp) < 0.6) {
      Object.assign(kat, { fase: 'actie', t: 0 });
      if (kat.actie === 'zit') geluid.miauw();
      if (kat.actie === 'spring') geluid.zaai();
      if (kat.actie === 'plas') S.plasje = { x: Math.round(kat.x + (kat.kant > 0 ? 2 : 9)), t: 0 };
    }
    if (kat.x < -14 || kat.x > W + 2) {
      S.kat = null;
      S.katKlok = rnd(10, 18);
    }
  }

  for (const d of S.katStof) {
    d.t -= dt;
    d.vy += 50 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }
  S.katStof = S.katStof.filter((d) => d.t > 0);
}

function katHouding(kat) {
  if (kat.fase === 'actie') {
    if (kat.actie === 'zit') return 'zit';
    if (kat.actie === 'plas') return 'plas';
    if (kat.actie === 'spring') return 'loop2';
    if (kat.actie === 'graaf') return Math.floor(kat.t * 10) % 2 ? 'graaf1' : 'graaf2';
  }
  return Math.floor(kat.t * 6) % 2 ? 'loop2' : 'loop1';
}

function tekenKat() {
  kctx.drawImage(schutting, 0, 0);
  if (!S.frenzy) tekenLucht(kctx, S.weer, SCHUTTING_Y, S.tijd);
  if (S.plasje) {
    // een gele druppelstraal langs de schutting en een plasje dat langzaam opdroogt
    const p = S.plasje;
    kctx.fillStyle = KLEUR.y;
    const lengte = Math.min(KAT_H - SCHUTTING_Y, Math.floor(p.t * 6));
    if (p.t < 2) kctx.fillRect(p.x, SCHUTTING_Y, 1, lengte);
    else if (p.t < 4) kctx.fillRect(p.x, SCHUTTING_Y + 2, 1, KAT_H - SCHUTTING_Y - 2);
  }
  const kat = S.kat;
  if (kat) {
    kctx.save();
    kctx.translate(Math.round(kat.x) + (kat.kant < 0 ? 12 : 0), KAT_Y + kat.y - 2); // plaatje heeft 2 rijen ruimte voor de halo
    if (kat.kant < 0) kctx.scale(-1, 1);
    kctx.drawImage(katPlaatje(kat.soort, katHouding(kat)), 0, 0);
    kctx.restore();
    if (kat.hartje > 0) {
      kctx.fillStyle = KLEUR.p;
      const x = Math.round(kat.x) + 5;
      const y = Math.round(kat.hartje * 4);
      kctx.fillRect(x, y, 1, 1);
      kctx.fillRect(x + 2, y, 1, 1);
      kctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  for (const d of S.katStof) {
    kctx.fillStyle = KLEUR.B;
    kctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  }
  if (S.schat) {
    const s = S.schat;
    const y = Math.round(Math.max(1, SCHUTTING_Y - 6 - s.t * 8)) - (s.gepakt ? Math.round(s.gepakt * 8) : 0);
    if (s.gepakt) tekenTekst(kctx, `+${SCHAT_PUNTEN}`, s.x + 3, Math.max(1, y), KLEUR.y);
    else if (s.t < 4 || Math.floor(s.t * 8) % 2) {
      kctx.drawImage(plaatje(s.soort), s.x, y);
      if (Math.floor(s.t * 4) % 2) {
        kctx.fillStyle = KLEUR.w;
        kctx.fillRect(s.x + 5, y - 1, 1, 1);
      }
    }
  }
}

kattenpad.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (toestand !== 'spelen' || S.frenzy) return;
  const r = kattenpad.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W;
  geluid.wakker();
  const s = S.schat;
  if (s && !s.gepakt && Math.abs(x - (s.x + 3)) < 8) {
    s.gepakt = 0.01;
    geluid.oogst(3);
    trilling(10);
    punt(SCHAT_PUNTEN);
    return;
  }
  const kat = S.kat;
  if (kat && Math.abs(x - (kat.x + 6)) < 10) {
    geluid.miauw();
    kat.hartje = 1;
  }
});

let vorige = 0;
function lus(nu) {
  const dt = Math.min(0.05, (nu - vorige) / 1000 || 0);
  vorige = nu;
  if (toestand === 'spelen') {
    if (S.frenzy) werkFrenzy(dt); // de gewone tuin staat stil
    else {
      werkBij(dt);
      werkKatBij(dt);
      if (toestand === 'spelen' && S.tijd >= S.volgendeFrenzy) startFrenzy();
    }
  }
  if (S) {
    teken();
    tekenKat();
  }
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
  document.body.classList.remove('frenzy', 'frenzy-groeit');
  frenzyBalk.hidden = true;
  nieuwSpel();
  toonStand();
  toonWeer();
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
  document.body.classList.remove('frenzy', 'frenzy-groeit');
  frenzyBalk.hidden = true;
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
    const namen = GEWASSEN[naam] ?? GEWAS_NAMEN[naam];
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = plaatjeUrl(naam);
    img.className = 'sprite';
    img.alt = '';
    li.append(img, `${aantal} ${aantal === 1 ? namen.naam.toLowerCase() : namen.meer}`);
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
  toonOnline();
  setTimeout(() => toestand === 'einde' && toon('einde'), 700);
}

// ---------- Online highscore ----------

const naamForm = $('naamForm');
const naamVeld = $('naamVeld');
const naamKnop = $('naamKnop');
const naamMelding = $('naamMelding');
const onlineRecords = $('onlineRecords');
let teVersturen = null; // { score, tijd } van het spel dat net klaar is

function toonTop(top, plek = null) {
  if (!top?.length) return;
  vulLijst($('onlineScores'), top, plek);
  onlineRecords.hidden = false;
}

function toonOnline() {
  // speeltijd inclusief de frenzy's; een testpotje (?frenzy=1 of ?weer=...) gaat niet naar de online top 10
  teVersturen = S.score > 0 && !TEST_FRENZY && !TEST_WEER ? { score: S.score, tijd: S.tijd + S.frenzyTijd } : null;
  naamForm.hidden = !teVersturen;
  naamForm.querySelector('.naam-rij').hidden = false;
  naamVeld.disabled = naamKnop.disabled = false;
  naamVeld.value = laatsteNaam();
  naamMelding.textContent = '';
  onlineRecords.hidden = true;
  haalTop().then((top) => toestand === 'einde' && toonTop(top));
}

naamForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const naam = naamVeld.value.trim();
  if (!teVersturen || !naam) return;
  naamVeld.blur();
  naamVeld.disabled = naamKnop.disabled = true;
  naamMelding.textContent = 'Even versturen...';
  const uit = await stuurScore(naam, teVersturen.score, teVersturen.tijd);
  if (uit.fout) {
    naamMelding.textContent = uit.fout;
    naamVeld.disabled = naamKnop.disabled = false;
    return;
  }
  bewaarNaam(naam);
  teVersturen = null;
  naamForm.querySelector('.naam-rij').hidden = true;
  naamMelding.textContent = uit.plek === 1 ? 'Nummer 1 van iedereen!' : uit.plek ? `Je staat op plek ${uit.plek}!` : 'Opgeslagen! Nog net niet in de top 10.';
  toonTop(uit.top, uit.plek);
});

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
toonWeer();
toonRecords();
toon('start');
pasGrootteAan();
requestAnimationFrame(lus);
