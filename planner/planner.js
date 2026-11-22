import { lees, bewaar } from '../shared/opslag.js';
import { PALET, PLANTEN, PLANT, relatie } from './plants.js';

// ---------- Pixelart: sprites en tegels als plaatjes ----------

const spriteCache = new Map();
function spriteUrl(id) {
  if (spriteCache.has(id)) return spriteCache.get(id);
  const raster = PLANT[id].sprite;
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d');
  raster.forEach((rij, y) => {
    [...rij].forEach((teken, x) => {
      if (PALET[teken]) {
        ctx.fillStyle = PALET[teken];
        ctx.fillRect(x, y, 1, 1);
      }
    });
  });
  const url = c.toDataURL();
  spriteCache.set(id, url);
  return url;
}

function spriteImg(id, grootte) {
  const img = document.createElement('img');
  img.className = 'sprite';
  img.src = spriteUrl(id);
  img.alt = '';
  if (grootte) {
    img.width = grootte;
    img.height = grootte;
  }
  return img;
}

// Vaste "willekeur" zodat de tegels er elke keer hetzelfde uitzien.
function rng(zaad) {
  let s = zaad;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const css = getComputedStyle(document.documentElement);
const kleur = (naam, standaard) => css.getPropertyValue(naam).trim() || standaard;
const K = {
  gras: kleur('--gras', '#63c74d'),
  grasDonker: kleur('--gras-donker', '#3e8948'),
  grasLicht: '#8fe06b',
  grond: kleur('--grond', '#8f563b'),
  grondDonker: kleur('--grond-donker', '#5d3a28'),
  grondLicht: '#a86c4a',
  pad: kleur('--pad', '#e4a672'),
  padDonker: '#b97d4e',
  padLicht: '#f3c9a0',
};

const VARIANTEN = 3;
function maakTegel(soort, variant) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d');
  const r = rng(soort.length * 97 + variant * 31 + 7);
  const px = (x, y, k) => {
    ctx.fillStyle = k;
    ctx.fillRect(x, y, 1, 1);
  };
  if (soort === 'gras') {
    ctx.fillStyle = K.gras;
    ctx.fillRect(0, 0, 8, 8);
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(r() * 8);
      const y = Math.floor(r() * 7) + 1;
      px(x, y, K.grasDonker);
      px(x, y - 1, K.grasDonker);
    }
    for (let i = 0; i < 2; i++) px(Math.floor(r() * 8), Math.floor(r() * 8), K.grasLicht);
  } else if (soort === 'grond') {
    ctx.fillStyle = K.grond;
    ctx.fillRect(0, 0, 8, 8);
    // Voren: twee donkere lijnen
    for (let x = 0; x < 8; x++) {
      px(x, 2, K.grondDonker);
      px(x, 6, K.grondDonker);
    }
    for (let i = 0; i < 4; i++) px(Math.floor(r() * 8), Math.floor(r() * 8), K.grondLicht);
  } else {
    ctx.fillStyle = K.pad;
    ctx.fillRect(0, 0, 8, 8);
    // Steentjes
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 7);
      const y = Math.floor(r() * 7);
      px(x, y, K.padLicht);
      px(x + 1, y, K.padLicht);
      px(x, y + 1, K.padDonker);
      px(x + 1, y + 1, K.padDonker);
    }
    for (let i = 0; i < 3; i++) px(Math.floor(r() * 8), Math.floor(r() * 8), K.padDonker);
  }
  return c.toDataURL();
}

const TEGELS = {};
for (const soort of ['gras', 'grond', 'pad']) {
  TEGELS[soort] = Array.from({ length: VARIANTEN }, (_, v) => `url(${maakTegel(soort, v)})`);
}

// ---------- Tuin-data ----------

const SLEUTEL = 'moestuin.tuin';
const MIN_K = 4, MAX_K = 12, MIN_R = 4, MAX_R = 16;
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MAAND_LANG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DEZE_MAAND = new Date().getMonth() + 1;

function starttuin() {
  const kolommen = 8;
  const rijen = 10;
  const cellen = [];
  for (let r = 0; r < rijen; r++) {
    for (let k = 0; k < kolommen; k++) {
      let g = 'gras';
      const binnen = k >= 1 && k <= 6 && r >= 1 && r <= 8;
      if (binnen) g = r === 4 || r === 5 ? 'pad' : 'grond';
      if (binnen && (k === 1 || k === 6) && (r === 4 || r === 5)) g = 'pad';
      cellen.push({ g, p: null });
    }
  }
  return { kolommen, rijen, cellen };
}

function geldig(t) {
  return (
    t && Number.isInteger(t.kolommen) && Number.isInteger(t.rijen) &&
    Array.isArray(t.cellen) && t.cellen.length === t.kolommen * t.rijen
  );
}

let tuin = lees(SLEUTEL, null);
if (!geldig(tuin)) tuin = starttuin();
// Onbekende planten (bijv. uit een oudere versie) weghalen
tuin.cellen.forEach((c) => { if (c.p && !PLANT[c.p]) c.p = null; });

const geschiedenis = [];
function onthoud() {
  geschiedenis.push(JSON.stringify(tuin));
  if (geschiedenis.length > 50) geschiedenis.shift();
  knopTerug.disabled = false;
}
function opslaan() {
  bewaar(SLEUTEL, tuin);
}

// ---------- Elementen ----------

const elTuin = document.getElementById('tuin');
const elHint = document.getElementById('hint');
const knopTerug = document.getElementById('ongedaan');
const plantIcoon = document.getElementById('plant-icoon');
const blad = document.getElementById('blad');
const bladAchter = document.getElementById('blad-achtergrond');
const bladTitel = document.getElementById('blad-titel');
const bladInhoud = document.getElementById('blad-inhoud');

let tool = 'grond';
let gekozenPlant = lees('moestuin.gekozenPlant', 'tomaat');
if (!PLANT[gekozenPlant]) gekozenPlant = 'tomaat';

function el(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}

function hint(tekst) {
  elHint.textContent = tekst;
}

// ---------- Tekenen van de tuin ----------

function celGrootte() {
  const app = document.getElementById('app');
  const stijl = getComputedStyle(app);
  const beschikbaar = app.clientWidth - parseFloat(stijl.paddingLeft) - parseFloat(stijl.paddingRight) - 8;
  return Math.max(24, Math.min(56, Math.floor(beschikbaar / tuin.kolommen)));
}

function buren(i) {
  const k = i % tuin.kolommen;
  const r = Math.floor(i / tuin.kolommen);
  const uit = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dk = -1; dk <= 1; dk++) {
      if (!dr && !dk) continue;
      const nk = k + dk;
      const nr = r + dr;
      if (nk < 0 || nr < 0 || nk >= tuin.kolommen || nr >= tuin.rijen) continue;
      uit.push(nr * tuin.kolommen + nk);
    }
  }
  return uit;
}

function heeftRuzie(i) {
  const p = tuin.cellen[i].p;
  if (!p) return false;
  return buren(i).some((j) => relatie(p, tuin.cellen[j].p) === 'slecht');
}

let celEls = [];
function tekenTuin() {
  elTuin.style.setProperty('--kolommen', tuin.kolommen);
  elTuin.style.setProperty('--cel', `${celGrootte()}px`);
  elTuin.replaceChildren();
  celEls = tuin.cellen.map((_, i) => {
    const d = el('div', 'cel');
    elTuin.append(d);
    return d;
  });
  tuin.cellen.forEach((_, i) => tekenCel(i));
}

function tekenCel(i, nieuw = false) {
  const c = tuin.cellen[i];
  const d = celEls[i];
  d.style.backgroundImage = TEGELS[c.g][(i * 7 + Math.floor(i / tuin.kolommen) * 3) % VARIANTEN];
  const img = d.querySelector('img');
  if (c.p) {
    if (!img || img.dataset.p !== c.p) {
      const nieuwImg = spriteImg(c.p);
      nieuwImg.dataset.p = c.p;
      img ? img.replaceWith(nieuwImg) : d.append(nieuwImg);
      d.classList.toggle('nieuw', nieuw);
    }
  } else if (img) {
    img.remove();
  }
  d.classList.toggle('ruzie', heeftRuzie(i));
}

function tekenRuzies() {
  celEls.forEach((d, i) => d.classList.toggle('ruzie', heeftRuzie(i)));
}

// ---------- Gereedschap ----------

function kiesTool(nieuw) {
  tool = nieuw;
  document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  const teksten = {
    grond: 'Veeg over de tuin om grond te maken. Daar kun je planten zetten.',
    pad: 'Veeg om een pad te leggen.',
    gras: 'Veeg om gras te maken.',
    plant: `Tik of veeg om ${PLANT[gekozenPlant].naam.toLowerCase()} te planten.`,
    gum: 'Tik op een plant om hem weg te halen.',
    kijk: 'Tik op een plant om te zien hoe je hem verzorgt.',
  };
  hint(teksten[tool]);
}

document.querySelectorAll('.tool').forEach((b) => {
  b.addEventListener('click', () => {
    if (b.dataset.tool === 'plant') openPlantkeuze();
    else kiesTool(b.dataset.tool);
  });
});
document.querySelectorAll('.tegel-icoon').forEach((s) => { s.style.backgroundImage = TEGELS[s.dataset.g][0]; });

function zetPlantIcoon() {
  plantIcoon.src = spriteUrl(gekozenPlant);
  plantIcoon.alt = PLANT[gekozenPlant].naam;
}

// Past een cel aan volgens het huidige gereedschap. Geeft true als er iets veranderde.
function pasToe(i) {
  const c = tuin.cellen[i];
  if (tool === 'grond' || tool === 'pad' || tool === 'gras') {
    if (c.g === tool && (tool === 'grond' || !c.p)) return false;
    c.g = tool;
    if (tool !== 'grond') c.p = null;
    return true;
  }
  if (tool === 'plant') {
    if (c.p === gekozenPlant) return false;
    c.p = gekozenPlant;
    c.g = 'grond';
    return true;
  }
  if (tool === 'gum') {
    if (!c.p) return false;
    c.p = null;
    return true;
  }
  return false;
}

function celOnder(e) {
  const rect = elTuin.getBoundingClientRect();
  const cel = rect.width / tuin.kolommen;
  const k = Math.floor((e.clientX - rect.left) / cel);
  const r = Math.floor((e.clientY - rect.top) / cel);
  if (k < 0 || r < 0 || k >= tuin.kolommen || r >= tuin.rijen) return -1;
  return r * tuin.kolommen + k;
}

let streek = null; // { veranderd, laatste }

elTuin.addEventListener('pointerdown', (e) => {
  const i = celOnder(e);
  if (i < 0) return;
  e.preventDefault();
  if (tool === 'kijk') {
    const p = tuin.cellen[i].p;
    if (p) openPlantinfo(p, i);
    else hint('Hier staat nog niets. Kies Plant om iets te zaaien.');
    return;
  }
  elTuin.setPointerCapture(e.pointerId);
  const voor = JSON.stringify(tuin);
  streek = { voor, veranderd: false, laatste: -1, geplant: 0 };
  verf(i);
});

elTuin.addEventListener('pointermove', (e) => {
  if (!streek) return;
  const i = celOnder(e);
  if (i >= 0) verf(i);
});

function verf(i) {
  if (i === streek.laatste) return;
  streek.laatste = i;
  if (pasToe(i)) {
    if (!streek.veranderd) {
      geschiedenis.push(streek.voor);
      if (geschiedenis.length > 50) geschiedenis.shift();
      knopTerug.disabled = false;
    }
    streek.veranderd = true;
    if (tool === 'plant') streek.geplant++;
    tekenCel(i, tool === 'plant');
    buren(i).forEach((j) => celEls[j].classList.toggle('ruzie', heeftRuzie(j)));
  }
}

function eindeStreek() {
  if (!streek) return;
  if (streek.veranderd) {
    opslaan();
    if (streek.geplant) {
      const naam = PLANT[gekozenPlant].naam;
      bewaar('moestuin.laatsteActie', { tekst: `${naam} geplant`, wanneer: Date.now() });
      const ruzie = celEls.some((d, i) => tuin.cellen[i].p === gekozenPlant && d.classList.contains('ruzie'));
      hint(ruzie
        ? `${naam} staat naast een slechte buur (!). Tik op Info en dan op de plant.`
        : `${naam} geplant! Tik op Info en dan op de plant voor tips.`);
    }
  }
  streek = null;
}
elTuin.addEventListener('pointerup', eindeStreek);
elTuin.addEventListener('pointercancel', eindeStreek);
elTuin.addEventListener('lostpointercapture', eindeStreek);

knopTerug.addEventListener('click', () => {
  const vorige = geschiedenis.pop();
  if (!vorige) return;
  tuin = JSON.parse(vorige);
  opslaan();
  tekenTuin();
  knopTerug.disabled = geschiedenis.length === 0;
  hint('Stap teruggezet.');
});
knopTerug.disabled = true;

// ---------- Onderblad ----------

let vorigeFocus = null;
function openBlad(titel, inhoud, icoon) {
  vorigeFocus = document.activeElement;
  bladTitel.replaceChildren();
  if (icoon) bladTitel.append(spriteImg(icoon, 32));
  bladTitel.append(document.createTextNode(titel));
  bladInhoud.replaceChildren(...[].concat(inhoud));
  blad.hidden = false;
  bladAchter.hidden = false;
  blad.scrollTop = 0;
  document.getElementById('blad-sluit').focus({ preventScroll: true });
}
function sluitBlad() {
  blad.hidden = true;
  bladAchter.hidden = true;
  celEls.forEach((d) => d.classList.remove('gekozen'));
  vorigeFocus?.focus?.({ preventScroll: true });
}
document.getElementById('blad-sluit').addEventListener('click', sluitBlad);
bladAchter.addEventListener('click', sluitBlad);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !blad.hidden) sluitBlad(); });

// Plantkeuze
let filter = 'alles';
function openPlantkeuze() {
  const filters = el('div', 'filters');
  const lijst = el('div', 'plantlijst');
  const opties = [['alles', 'Alles'], ['groente', 'Groente'], ['fruit', 'Fruit'], ['kruid', 'Kruiden & bloemen'], ['nu', `Nu zaaien`]];
  const vul = () => {
    filters.querySelectorAll('.filter').forEach((f) => f.setAttribute('aria-pressed', String(f.dataset.f === filter)));
    lijst.replaceChildren();
    PLANTEN.filter((p) => {
      if (filter === 'alles') return true;
      if (filter === 'nu') return p.z.includes(DEZE_MAAND);
      if (filter === 'kruid') return p.soort === 'kruid' || p.soort === 'bloem';
      return p.soort === filter;
    }).forEach((p) => {
      const b = el('button', 'plantkeuze');
      b.type = 'button';
      if (p.z.includes(DEZE_MAAND)) b.classList.add('nu');
      b.setAttribute('aria-pressed', String(p.id === gekozenPlant));
      b.append(spriteImg(p.id, 40), document.createTextNode(p.naam));
      b.addEventListener('click', () => {
        gekozenPlant = p.id;
        bewaar('moestuin.gekozenPlant', p.id);
        zetPlantIcoon();
        sluitBlad();
        kiesTool('plant');
      });
      lijst.append(b);
    });
    if (!lijst.children.length) lijst.append(el('p', 'leeg', 'Deze maand valt er niets te zaaien. Tijd voor warme chocomel!'));
  };
  opties.forEach(([f, label]) => {
    const b = el('button', 'filter', label);
    b.type = 'button';
    b.dataset.f = f;
    b.addEventListener('click', () => { filter = f; vul(); });
    filters.append(b);
  });
  vul();
  openBlad('Wat wil je planten?', [filters, lijst, el('p', 'legenda', `Groen vlak = kun je in ${MAAND_LANG[DEZE_MAAND - 1]} zaaien of planten.`)]);
}

function kalender(p) {
  const k = el('div', 'kalender');
  k.append(el('span', ''));
  MAANDEN.forEach((m, i) => k.append(el('span', `m${i + 1 === DEZE_MAAND ? ' nu' : ''}`, m[0].toUpperCase())));
  k.append(el('span', '', 'Zaaien'));
  for (let m = 1; m <= 12; m++) k.append(el('span', `blok${p.z.includes(m) ? ' zaai' : ''}`));
  k.append(el('span', '', 'Oogst'));
  for (let m = 1; m <= 12; m++) k.append(el('span', `blok${p.o.includes(m) ? ' oogst' : ''}`));
  return k;
}

function burenLijst(ids, soort) {
  const d = el('div', 'buren');
  ids.forEach((id) => {
    const b = el('span', `buur ${soort}`);
    b.append(spriteImg(id, 16), document.createTextNode(PLANT[id].naam));
    d.append(b);
  });
  return d;
}

function alleBuren(id, soort) {
  return PLANTEN.filter((q) => relatie(id, q.id) === soort).map((q) => q.id);
}

function openPlantinfo(id, celIndex = -1) {
  const p = PLANT[id];
  const delen = [];
  const dl = el('dl', '');
  [['Zaaien', p.zaaien], ['Water', p.water], ['Zon', p.zon], ['Afstand', p.afstand]].forEach(([t, w]) => {
    const rij = el('div', 'info-rij');
    rij.append(el('dt', '', t), el('dd', '', w));
    dl.append(rij);
  });
  delen.push(kalender(p), dl, el('p', 'tip', `Tip: ${p.tip}`));

  const goed = alleBuren(id, 'goed');
  const slecht = alleBuren(id, 'slecht');
  if (goed.length) delen.push(el('h3', '', 'Goede buren'), burenLijst(goed, 'goed'));
  if (slecht.length) delen.push(el('h3', '', 'Liever niet naast'), burenLijst(slecht, 'slecht'));

  if (celIndex >= 0) {
    celEls[celIndex].classList.add('gekozen');
    const naast = [...new Set(buren(celIndex).map((j) => tuin.cellen[j].p).filter((q) => q && q !== id))];
    const sectie = el('div', 'in-tuin');
    sectie.append(el('h3', '', 'In jouw tuin ernaast'));
    if (!naast.length) {
      sectie.append(el('p', 'leeg', 'Nog geen andere planten ernaast.'));
    } else {
      const g = naast.filter((q) => relatie(id, q) === 'goed');
      const s = naast.filter((q) => relatie(id, q) === 'slecht');
      const n = naast.filter((q) => !relatie(id, q));
      if (g.length) sectie.append(burenLijst(g, 'goed'));
      if (s.length) sectie.append(burenLijst(s, 'slecht'), el('p', 'leeg', 'Tip: zet deze wat verder uit elkaar.'));
      if (n.length) sectie.append(burenLijst(n, ''));
    }
    const weg = el('button', 'knop rood breed', 'Haal deze plant weg');
    weg.type = 'button';
    weg.addEventListener('click', () => {
      onthoud();
      tuin.cellen[celIndex].p = null;
      opslaan();
      tekenCel(celIndex);
      tekenRuzies();
      sluitBlad();
      hint(`${p.naam} weggehaald.`);
    });
    sectie.append(weg);
    delen.push(sectie);
  }
  openBlad(p.naam, delen, id);
}

// Deze maand
document.getElementById('nu-knop').addEventListener('click', () => {
  const inTuin = [...new Set(tuin.cellen.map((c) => c.p).filter(Boolean))];
  const maand = MAAND_LANG[DEZE_MAAND - 1];
  const groep = (titel, ids, leeg) => {
    const g = el('div', 'maand-groep');
    g.append(el('h3', '', titel));
    if (ids.length) {
      const lijst = burenLijst(ids, '');
      lijst.querySelectorAll('.buur').forEach((b, i) => {
        b.style.cursor = 'pointer';
        b.setAttribute('role', 'button');
        b.tabIndex = 0;
        b.addEventListener('click', () => openPlantinfo(ids[i]));
      });
      g.append(lijst);
    } else {
      g.append(el('p', 'leeg', leeg));
    }
    return g;
  };
  const oogst = inTuin.filter((id) => PLANT[id].o.includes(DEZE_MAAND));
  const zaai = inTuin.filter((id) => PLANT[id].z.includes(DEZE_MAAND));
  const anders = PLANTEN.filter((p) => !inTuin.includes(p.id) && p.z.includes(DEZE_MAAND)).map((p) => p.id);
  openBlad(`In ${maand}`, [
    groep('Oogsten uit jouw tuin', oogst, inTuin.length ? 'Nog niets te oogsten.' : 'Je hebt nog niets geplant.'),
    groep('Zaaien of planten', zaai, 'Niets uit jouw tuin.'),
    groep('Ook leuk om nu te zaaien', anders, 'Even rust in de tuin.'),
  ]);
});

// Tuinmaat
document.getElementById('maat-knop').addEventListener('click', () => {
  let k = tuin.kolommen;
  let r = tuin.rijen;
  const stapper = (label, waarde, min, max, zet) => {
    const rij = el('div', 'maat-rij');
    const s = el('div', 'stapper');
    const min1 = el('button', '', '-');
    const out = el('output', '', String(waarde));
    const plus = el('button', '', '+');
    min1.type = plus.type = 'button';
    min1.setAttribute('aria-label', `${label} minder`);
    plus.setAttribute('aria-label', `${label} meer`);
    const pas = (d) => {
      waarde = Math.max(min, Math.min(max, waarde + d));
      out.textContent = String(waarde);
      zet(waarde);
    };
    min1.addEventListener('click', () => pas(-1));
    plus.addEventListener('click', () => pas(1));
    s.append(min1, out, plus);
    rij.append(el('span', '', label), s);
    return rij;
  };
  const toepassen = el('button', 'knop groen breed', 'Maat aanpassen');
  toepassen.type = 'button';
  toepassen.addEventListener('click', () => {
    if (k !== tuin.kolommen || r !== tuin.rijen) {
      onthoud();
      const cellen = [];
      for (let y = 0; y < r; y++) {
        for (let x = 0; x < k; x++) {
          cellen.push(x < tuin.kolommen && y < tuin.rijen ? tuin.cellen[y * tuin.kolommen + x] : { g: 'gras', p: null });
        }
      }
      tuin = { kolommen: k, rijen: r, cellen };
      opslaan();
      tekenTuin();
      hint(`Je tuin is nu ${k} bij ${r} vakjes.`);
    }
    sluitBlad();
  });
  const wis = el('button', 'knop rood breed', 'Begin opnieuw');
  wis.type = 'button';
  let zeker = false;
  wis.addEventListener('click', () => {
    if (!zeker) {
      zeker = true;
      wis.textContent = 'Echt alles wissen?';
      return;
    }
    onthoud();
    tuin = { kolommen: k, rijen: r, cellen: Array.from({ length: k * r }, () => ({ g: 'gras', p: null })) };
    opslaan();
    tekenTuin();
    sluitBlad();
    hint('Lege tuin. Begin met Grond en veeg je bedden.');
  });
  const knoppen = el('div', 'knoppen-rij');
  knoppen.append(toepassen, wis);
  openBlad('Hoe groot is je tuin?', [
    el('p', 'leeg', 'Eén vakje is ongeveer een halve meter.'),
    stapper('Breed', k, MIN_K, MAX_K, (v) => { k = v; }),
    stapper('Lang', r, MIN_R, MAX_R, (v) => { r = v; }),
    knoppen,
  ]);
});

// ---------- Start ----------

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => elTuin.style.setProperty('--cel', `${celGrootte()}px`), 100);
});

zetPlantIcoon();
tekenTuin();
kiesTool('grond');
