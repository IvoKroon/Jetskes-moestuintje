import { lees, bewaar } from '../shared/opslag.js';
import { PALET, PLANTEN, PLANT, relatie } from './plants.js';

// Moestuinplanner in de stijl van een woninginrichter: een plattegrond in echte centimeters
// waarop je bakken, paden, een kas en plantvakken sleept, vergroot en draait.

const SVGNS = 'http://www.w3.org/2000/svg';
const SLEUTEL = 'moestuin.ontwerp';
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MAAND_LANG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DEZE_MAAND = new Date().getMonth() + 1;

// ---------- Catalogus van tuinonderdelen (maten in cm) ----------

const ONDERDELEN = {
  gazon: { naam: 'Grasveld', w: 300, h: 300, laag: 0, min: 50 },
  pad: { naam: 'Tegelpad', w: 60, h: 300, laag: 1, min: 30 },
  grind: { naam: 'Grindpad', w: 80, h: 300, laag: 1, min: 30 },
  bed: { naam: 'Groentebed', w: 120, h: 300, laag: 2, min: 30, beplantbaar: true },
  bak: { naam: 'Moestuinbak', w: 120, h: 240, laag: 2, min: 40, beplantbaar: true, rand: 8 },
  kas: { naam: 'Kas', w: 250, h: 300, laag: 3, min: 120, beplantbaar: true, rand: 4 },
  schuur: { naam: 'Schuurtje', w: 200, h: 240, laag: 3, min: 100 },
  compost: { naam: 'Compostbak', w: 100, h: 100, laag: 3, min: 60 },
  regenton: { naam: 'Regenton', w: 60, h: 60, laag: 3, min: 40, rond: true },
  bank: { naam: 'Bankje', w: 150, h: 50, laag: 3, min: 80 },
  boom: { naam: 'Fruitboom', w: 300, h: 300, laag: 5, min: 100, rond: true },
};
const CATALOGUS_INRICHTING = ['bak', 'bed', 'pad', 'grind', 'gazon', 'kas', 'schuur', 'compost', 'regenton', 'bank', 'boom'];

// ---------- Pixelart-sprites van de planten ----------

const spriteCache = new Map();
function spriteUrl(id) {
  if (spriteCache.has(id)) return spriteCache.get(id);
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d');
  PLANT[id].sprite.forEach((rij, y) => {
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
  img.src = spriteUrl(id);
  img.alt = '';
  if (grootte) { img.width = grootte; img.height = grootte; }
  return img;
}

// ---------- Hulpjes ----------

function el(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}
function s(tag, attrs = {}, ouder) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (ouder) ouder.append(e);
  return e;
}
const klem = (v, a, b) => Math.max(a, Math.min(b, v));
const rond = (v, stap) => Math.round(v / stap) * stap;
const meter = (cm) => (cm >= 100 ? `${(cm / 100).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} m` : `${cm} cm`);
let volgnummer = 0;
const nieuwId = () => `i${Date.now().toString(36)}${(volgnummer++).toString(36)}`;

// ---------- Ontwerp-data ----------

function voorbeeldtuin() {
  const items = [
    { t: 'pad', x: 370, y: 0, w: 60, h: 1000 },
    { t: 'pad', x: 0, y: 470, w: 370, h: 60 },
    { t: 'bak', x: 60, y: 60, w: 120, h: 240 },
    { t: 'bak', x: 220, y: 60, w: 120, h: 240 },
    { t: 'bed', x: 40, y: 580, w: 300, h: 120 },
    { t: 'bed', x: 40, y: 740, w: 300, h: 120 },
    { t: 'kas', x: 490, y: 60, w: 250, h: 300 },
    { t: 'schuur', x: 520, y: 760, w: 220, h: 200 },
    { t: 'compost', x: 470, y: 620, w: 100, h: 100 },
    { t: 'regenton', x: 750, y: 380, w: 60, h: 60 },
    { t: 'gazon', x: 0, y: 900, w: 360, h: 100 },
    { t: 'bank', x: 110, y: 920, w: 150, h: 50 },
    { t: 'boom', x: 560, y: 400, w: 240, h: 240 },
    { t: 'plant', p: 'tomaat', x: 516, y: 85, w: 50, h: 250 },
    { t: 'plant', p: 'basilicum', x: 566, y: 85, w: 40, h: 240 },
    { t: 'plant', p: 'paprika', x: 626, y: 85, w: 90, h: 135 },
    { t: 'plant', p: 'sla', x: 70, y: 70, w: 100, h: 100 },
    { t: 'plant', p: 'radijs', x: 70, y: 180, w: 100, h: 50 },
    { t: 'plant', p: 'wortel', x: 70, y: 240, w: 100, h: 50 },
    { t: 'plant', p: 'aardbei', x: 235, y: 75, w: 90, h: 210 },
    { t: 'plant', p: 'aardappel', x: 50, y: 590, w: 280, h: 105 },
    { t: 'plant', p: 'boon', x: 50, y: 750, w: 150, h: 105 },
    { t: 'plant', p: 'ui', x: 250, y: 750, w: 80, h: 100 },
  ];
  return { breedte: 800, lengte: 1000, items: items.map((i) => ({ id: nieuwId(), ...i })) };
}

function geldig(o) {
  return o && Number.isFinite(o.breedte) && Number.isFinite(o.lengte) && Array.isArray(o.items);
}

let ontwerp = lees(SLEUTEL, null);
if (!geldig(ontwerp)) ontwerp = voorbeeldtuin();
ontwerp.items = ontwerp.items.filter((i) => (i.t === 'plant' ? PLANT[i.p] : ONDERDELEN[i.t]));

const geschiedenis = [];
function onthoud(stand = JSON.stringify(ontwerp)) {
  geschiedenis.push(stand);
  if (geschiedenis.length > 60) geschiedenis.shift();
  knopTerug.disabled = false;
}
function opslaan() {
  bewaar(SLEUTEL, ontwerp);
}

// ---------- Elementen ----------

const svg = document.getElementById('plan');
const defs = document.getElementById('defs');
const wereld = document.getElementById('wereld');
const laagTuin = document.getElementById('laag-tuin');
const laagItems = document.getElementById('laag-items');
const laagBoven = document.getElementById('laag-boven');
const doek = document.getElementById('doek');
const elMelding = document.getElementById('melding');
const knopTerug = document.getElementById('terug');
const balkHoofd = document.getElementById('balk-hoofd');
const balkSel = document.getElementById('balk-selectie');

let meldingTimer;
function meld(tekst) {
  elMelding.textContent = tekst;
  elMelding.classList.add('zichtbaar');
  clearTimeout(meldingTimer);
  meldingTimer = setTimeout(() => elMelding.classList.remove('zichtbaar'), 2600);
}

// ---------- Patronen (texturen in centimeters) ----------

function maakPatronen() {
  const pat = (id, w, h) => s('pattern', { id, width: w, height: h, patternUnits: 'userSpaceOnUse' }, defs);

  let p = pat('p-gras', 40, 40);
  s('rect', { width: 40, height: 40, fill: '#8cc66b' }, p);
  [[6, 8], [22, 4], [32, 20], [12, 28], [26, 33]].forEach(([x, y]) =>
    s('path', { d: `M${x} ${y + 5}l2-5l2 5`, stroke: '#6fae52', 'stroke-width': 1.4, fill: 'none' }, p));

  p = pat('p-gazon', 60, 60);
  s('rect', { width: 60, height: 60, fill: '#9fd57c' }, p);
  s('rect', { width: 30, height: 60, fill: '#93cc70' }, p);

  p = pat('p-grond', 24, 24);
  s('rect', { width: 24, height: 24, fill: '#8f5d3f' }, p);
  [[4, 5, '#7a4c32'], [15, 3, '#a26e4d'], [9, 14, '#7a4c32'], [19, 17, '#a26e4d'], [3, 20, '#a26e4d']].forEach(([x, y, k]) =>
    s('circle', { cx: x, cy: y, r: 1.6, fill: k }, p));

  p = pat('p-tegel', 30, 30);
  s('rect', { width: 30, height: 30, fill: '#cdbfa8' }, p);
  s('rect', { x: 1, y: 1, width: 28, height: 28, rx: 1.5, fill: '#e0d4c0' }, p);

  p = pat('p-grind', 14, 14);
  s('rect', { width: 14, height: 14, fill: '#ddd6c6' }, p);
  [[3, 3, '#bfb6a3'], [10, 5, '#c9c1af'], [6, 10, '#b5ab97'], [12, 12, '#cbc3b1']].forEach(([x, y, k]) =>
    s('circle', { cx: x, cy: y, r: 1.8, fill: k }, p));

  p = pat('p-hout', 12, 200);
  s('rect', { width: 12, height: 200, fill: '#b98552' }, p);
  s('rect', { width: 1.2, height: 200, fill: '#9c6c3f' }, p);
}

const plantPatronen = new Set();
function plantPatroon(id) {
  const naam = `pp-${id}`;
  if (plantPatronen.has(id)) return naam;
  plantPatronen.add(id);
  const r = PLANT[id].ruimte;
  const p = s('pattern', { id: naam, width: r, height: r, patternUnits: 'userSpaceOnUse' }, defs);
  s('circle', { cx: r / 2, cy: r / 2, r: r * 0.46, fill: '#63c74d', 'fill-opacity': 0.35 }, p);
  s('image', { href: spriteUrl(id), x: r * 0.15, y: r * 0.15, width: r * 0.7, height: r * 0.7, preserveAspectRatio: 'none' }, p);
  return naam;
}

// ---------- Beeld: schuiven en zoomen ----------

const beeld = { x: 0, y: 0, schaal: 1 };

function zetBeeld() {
  wereld.setAttribute('transform', `translate(${beeld.x} ${beeld.y}) scale(${beeld.schaal})`);
  tekenBoven();
}

function passend() {
  const r = svg.getBoundingClientRect();
  const marge = 36;
  beeld.schaal = Math.min((r.width - marge * 2) / ontwerp.breedte, (r.height - marge * 2) / ontwerp.lengte);
  beeld.x = (r.width - ontwerp.breedte * beeld.schaal) / 2;
  beeld.y = (r.height - ontwerp.lengte * beeld.schaal) / 2;
  zetBeeld();
}

function zoom(factor, cx, cy) {
  const r = svg.getBoundingClientRect();
  if (cx === undefined) { cx = r.width / 2; cy = r.height / 2; }
  const nieuw = klem(beeld.schaal * factor, 0.15, 12);
  const f = nieuw / beeld.schaal;
  beeld.x = cx - (cx - beeld.x) * f;
  beeld.y = cy - (cy - beeld.y) * f;
  beeld.schaal = nieuw;
  zetBeeld();
}

function naarWereld(clientX, clientY) {
  const r = svg.getBoundingClientRect();
  return { x: (clientX - r.left - beeld.x) / beeld.schaal, y: (clientY - r.top - beeld.y) / beeld.schaal };
}

// ---------- Tekenen ----------

function tekenTuin() {
  laagTuin.replaceChildren();
  const { breedte: B, lengte: L } = ontwerp;
  s('rect', { x: -12, y: -12, width: B + 24, height: L + 24, rx: 6, fill: '#7a5a3a' }, laagTuin);
  s('rect', { width: B, height: L, fill: 'url(#p-gras)' }, laagTuin);
  const raster = s('g', { stroke: '#ffffff', 'stroke-opacity': 0.35, 'vector-effect': 'non-scaling-stroke' }, laagTuin);
  for (let x = 100; x < B; x += 100) s('line', { x1: x, y1: 0, x2: x, y2: L, 'vector-effect': 'non-scaling-stroke' }, raster);
  for (let y = 100; y < L; y += 100) s('line', { x1: 0, y1: y, x2: B, y2: y, 'vector-effect': 'non-scaling-stroke' }, raster);
}

function tekenItem(item) {
  const g = s('g', { transform: `translate(${item.x} ${item.y})`, 'data-id': item.id });
  const { w, h } = item;
  const lang = h >= w;
  switch (item.t) {
    case 'gazon':
      s('rect', { width: w, height: h, fill: 'url(#p-gazon)', rx: 4 }, g);
      break;
    case 'pad':
      s('rect', { width: w, height: h, fill: 'url(#p-tegel)' }, g);
      break;
    case 'grind':
      s('rect', { width: w, height: h, fill: 'url(#p-grind)', rx: 6 }, g);
      break;
    case 'bed':
      s('rect', { width: w, height: h, rx: 14, fill: 'url(#p-grond)', stroke: '#6b442c', 'stroke-width': 3 }, g);
      break;
    case 'bak': {
      const r = ONDERDELEN.bak.rand;
      s('rect', { width: w, height: h, rx: 3, fill: '#b98552', stroke: '#7a5232', 'stroke-width': 2 }, g);
      s('rect', { x: r, y: r, width: w - 2 * r, height: h - 2 * r, fill: 'url(#p-grond)' }, g);
      break;
    }
    case 'kas': {
      s('rect', { width: w, height: h, fill: 'url(#p-grond)' }, g);
      s('rect', { width: w, height: h, fill: '#e6f6ff', 'fill-opacity': 0.45, stroke: '#7fa8bf', 'stroke-width': 4 }, g);
      const lijnen = s('g', { stroke: '#9cc2d6', 'stroke-width': 1.5, 'pointer-events': 'none' }, g);
      if (lang) {
        for (let y = 60; y < h; y += 60) s('line', { x1: 0, y1: y, x2: w, y2: y }, lijnen);
        s('line', { x1: w / 2, y1: 0, x2: w / 2, y2: h, stroke: '#7fa8bf', 'stroke-width': 3 }, lijnen);
      } else {
        for (let x = 60; x < w; x += 60) s('line', { x1: x, y1: 0, x2: x, y2: h }, lijnen);
        s('line', { x1: 0, y1: h / 2, x2: w, y2: h / 2, stroke: '#7fa8bf', 'stroke-width': 3 }, lijnen);
      }
      break;
    }
    case 'schuur': {
      s('rect', { width: w, height: h, fill: '#8a4b38', stroke: '#5a2f22', 'stroke-width': 3 }, g);
      if (lang) s('rect', { x: w / 2, width: w / 2, height: h, fill: '#a35a43' }, g);
      else s('rect', { y: h / 2, width: w, height: h / 2, fill: '#a35a43' }, g);
      const lijnen = s('g', { stroke: '#6e3a2b', 'stroke-width': 1.5 }, g);
      if (lang) for (let y = 20; y < h; y += 20) s('line', { x1: 0, y1: y, x2: w, y2: y }, lijnen);
      else for (let x = 20; x < w; x += 20) s('line', { x1: x, y1: 0, x2: x, y2: h }, lijnen);
      if (lang) s('line', { x1: w / 2, y1: 0, x2: w / 2, y2: h, stroke: '#4a271c', 'stroke-width': 4 }, g);
      else s('line', { x1: 0, y1: h / 2, x2: w, y2: h / 2, stroke: '#4a271c', 'stroke-width': 4 }, g);
      break;
    }
    case 'compost':
      s('rect', { width: w, height: h, rx: 3, fill: 'url(#p-hout)', stroke: '#7a5232', 'stroke-width': 3 }, g);
      s('rect', { x: 10, y: 10, width: w - 20, height: h - 20, rx: 4, fill: '#5d3d26' }, g);
      s('circle', { cx: w * 0.4, cy: h * 0.45, r: Math.min(w, h) * 0.08, fill: '#7fae4f' }, g);
      s('circle', { cx: w * 0.62, cy: h * 0.6, r: Math.min(w, h) * 0.06, fill: '#e3a33b' }, g);
      break;
    case 'regenton':
      s('circle', { cx: w / 2, cy: h / 2, r: w / 2, fill: '#3e6b48', stroke: '#26452e', 'stroke-width': 4 }, g);
      s('circle', { cx: w / 2, cy: h / 2, r: w / 2 - 8, fill: '#6fb0d8' }, g);
      s('circle', { cx: w * 0.4, cy: h * 0.4, r: w * 0.08, fill: '#a9d6f0' }, g);
      break;
    case 'bank': {
      s('rect', { width: w, height: h, rx: 4, fill: '#c08a55', stroke: '#7a5232', 'stroke-width': 2 }, g);
      const lijnen = s('g', { stroke: '#8d6038', 'stroke-width': 1.5 }, g);
      if (w >= h) for (let y = h / 4; y < h; y += h / 4) s('line', { x1: 3, y1: y, x2: w - 3, y2: y }, lijnen);
      else for (let x = w / 4; x < w; x += w / 4) s('line', { x1: x, y1: 3, x2: x, y2: h - 3 }, lijnen);
      break;
    }
    case 'boom': {
      const kroon = s('g', { 'pointer-events': 'none' }, g);
      s('circle', { cx: w / 2, cy: h / 2, r: w / 2, fill: '#3e8948', 'fill-opacity': 0.45, stroke: '#2d6a36', 'stroke-width': 3 }, kroon);
      [[0.35, 0.35, 0.22], [0.66, 0.4, 0.2], [0.45, 0.68, 0.2]].forEach(([fx, fy, fr]) =>
        s('circle', { cx: w * fx, cy: h * fy, r: w * fr, fill: '#58a24f', 'fill-opacity': 0.45 }, kroon));
      [[0.3, 0.55], [0.7, 0.62], [0.58, 0.25]].forEach(([fx, fy]) =>
        s('circle', { cx: w * fx, cy: h * fy, r: 7, fill: '#e43b44' }, kroon));
      s('circle', { cx: w / 2, cy: h / 2, r: Math.max(18, w * 0.08), fill: '#7a5232', stroke: '#4f3420', 'stroke-width': 3 }, g);
      break;
    }
    case 'plant': {
      s('rect', { width: w, height: h, rx: 4, fill: '#7a4c32', 'fill-opacity': 0.35 }, g);
      s('rect', { width: w, height: h, rx: 4, fill: `url(#${plantPatroon(item.p)})`, stroke: '#2f6e37', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, g);
      break;
    }
  }
  // Naam op grote onderdelen
  const label = { kas: 'Kas', schuur: 'Schuur', compost: 'Compost' }[item.t];
  if (label && Math.min(w, h) >= 80) {
    const t = s('text', { x: w / 2, y: item.t === 'kas' ? h - 22 : h / 2, class: 'label-tekst', 'font-size': Math.min(28, Math.min(w, h) / 4) }, g);
    t.textContent = label;
  }
  return g;
}

function gesorteerd() {
  const laag = (i) => (i.t === 'plant' ? 4 : ONDERDELEN[i.t].laag);
  return [...ontwerp.items].sort((a, b) => laag(a) - laag(b));
}

function tekenItems() {
  laagItems.replaceChildren(...gesorteerd().map(tekenItem));
  tekenBoven();
}

function tekenItemOpnieuw(item) {
  const oud = laagItems.querySelector(`[data-id="${item.id}"]`);
  if (oud) oud.replaceWith(tekenItem(item));
  else tekenItems();
}

// Plantvakken die naast een slechte buur liggen (binnen 20 cm)
function slechteBuren(item) {
  if (item.t !== 'plant') return [];
  return ontwerp.items.filter((j) => j !== item && j.t === 'plant' && relatie(item.p, j.p) === 'slecht' && dichtbij(item, j, 20));
}
function burenVan(item) {
  return ontwerp.items.filter((j) => j !== item && j.t === 'plant' && j.p !== item.p && dichtbij(item, j, 20));
}
function dichtbij(a, b, afstand) {
  return a.x - afstand < b.x + b.w && b.x - afstand < a.x + a.w && a.y - afstand < b.y + b.h && b.y - afstand < a.y + a.h;
}

function tekenBoven() {
  laagBoven.replaceChildren();
  const k = 1 / beeld.schaal; // 1 schermpixel in cm
  const { breedte: B, lengte: L } = ontwerp;

  // Maatvoering van de hele tuin
  const maat = s('g', {}, laagBoven);
  const t1 = s('text', { x: B / 2, y: -22 * k, class: 'maat-tekst', 'font-size': 12 * k }, maat);
  t1.textContent = meter(B);
  const t2 = s('text', { x: -22 * k, y: L / 2, class: 'maat-tekst', 'font-size': 12 * k, transform: `rotate(-90 ${-22 * k} ${L / 2})` }, maat);
  t2.textContent = meter(L);

  // Waarschuwingen voor slechte buren
  ontwerp.items.forEach((i) => {
    if (!slechteBuren(i).length) return;
    const g = s('g', { transform: `translate(${i.x + i.w} ${i.y})`, 'pointer-events': 'none' }, laagBoven);
    s('circle', { r: 9 * k, fill: '#e43b44', stroke: '#fff', 'stroke-width': 2 * k }, g);
    const t = s('text', { class: 'maat-tekst', 'font-size': 12 * k, fill: '#fff', style: 'fill:#fff' }, g);
    t.textContent = '!';
  });

  // Selectie met greep om te vergroten
  const sel = gekozen();
  if (sel) {
    s('rect', {
      x: sel.x, y: sel.y, width: sel.w, height: sel.h,
      fill: 'none', stroke: '#f2a516', 'stroke-width': 3 * k, 'stroke-dasharray': `${8 * k} ${5 * k}`, 'pointer-events': 'none',
    }, laagBoven);
    const label = s('g', { transform: `translate(${sel.x + sel.w / 2} ${sel.y - 16 * k})`, 'pointer-events': 'none' }, laagBoven);
    const tekst = `${meter(sel.w)} × ${meter(sel.h)}`;
    s('rect', { x: -tekst.length * 3.6 * k - 8 * k, y: -11 * k, width: tekst.length * 7.2 * k + 16 * k, height: 22 * k, rx: 11 * k, fill: '#233024' }, label);
    const t = s('text', { class: 'maat-tekst', 'font-size': 12 * k, style: 'fill:#fff' }, label);
    t.textContent = tekst;
    const greep = s('g', { transform: `translate(${sel.x + sel.w} ${sel.y + sel.h})`, 'data-greep': '1' }, laagBoven);
    s('circle', { r: 22 * k, fill: 'transparent' }, greep);
    s('circle', { r: 11 * k, fill: '#fff', stroke: '#f2a516', 'stroke-width': 3 * k }, greep);
    s('path', { d: `M${-4 * k} ${4 * k}L${4 * k} ${-4 * k}`, stroke: '#233024', 'stroke-width': 2 * k }, greep);
  }
}

// ---------- Selectie ----------

let selectieId = null;
const gekozen = () => ontwerp.items.find((i) => i.id === selectieId) || null;
const naamVan = (i) => (i.t === 'plant' ? PLANT[i.p].naam : ONDERDELEN[i.t].naam);

function aantalPlanten(i) {
  const r = PLANT[i.p].ruimte;
  return Math.max(1, Math.floor((i.w + 1) / r)) * Math.max(1, Math.floor((i.h + 1) / r));
}

function kies(id) {
  selectieId = id;
  const sel = gekozen();
  balkHoofd.hidden = !!sel;
  balkSel.hidden = !sel;
  if (sel) {
    document.getElementById('sel-naam').textContent = naamVan(sel);
    werkSelectieMaatBij();
    document.getElementById('sel-beplant').hidden = !ONDERDELEN[sel.t]?.beplantbaar;
    document.getElementById('sel-info').hidden = sel.t !== 'plant';
    document.getElementById('sel-draai').hidden = !!ONDERDELEN[sel.t]?.rond || sel.w === sel.h;
  }
  tekenBoven();
}

function werkSelectieMaatBij() {
  const sel = gekozen();
  if (!sel) return;
  let tekst = `${meter(sel.w)} × ${meter(sel.h)}`;
  if (sel.t === 'plant') {
    const n = aantalPlanten(sel);
    tekst = `${n} ${n === 1 ? 'plant' : 'planten'} · ${tekst}`;
  }
  document.getElementById('sel-maat').textContent = tekst;
}

// ---------- Aanwijzer: slepen, vergroten, schuiven, knijpen ----------

const aanwijzers = new Map();
let gebaar = null;

svg.addEventListener('pointerdown', (e) => {
  svg.setPointerCapture(e.pointerId);
  aanwijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (aanwijzers.size === 2) {
    // Overstappen op knijpen om te zoomen
    if (gebaar?.veranderd) afronden();
    const [a, b] = [...aanwijzers.values()];
    gebaar = { soort: 'knijp', afstand: Math.hypot(a.x - b.x, a.y - b.y), midden: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    return;
  }
  if (aanwijzers.size > 2) return;

  const wPunt = naarWereld(e.clientX, e.clientY);
  const greep = e.target.closest('[data-greep]');
  const doel = e.target.closest('[data-id]');
  const voor = JSON.stringify(ontwerp);

  if (greep && gekozen()) {
    const i = gekozen();
    gebaar = { soort: 'maat', item: i, start: wPunt, w: i.w, h: i.h, voor, veranderd: false };
  } else if (doel) {
    const id = doel.dataset.id;
    if (id !== selectieId) kies(id);
    const i = gekozen();
    gebaar = { soort: 'sleep', item: i, start: wPunt, x: i.x, y: i.y, voor, veranderd: false };
  } else {
    gebaar = { soort: 'schuif', start: { x: e.clientX, y: e.clientY }, bx: beeld.x, by: beeld.y, bewogen: false };
    svg.classList.add('slepen');
  }
});

svg.addEventListener('pointermove', (e) => {
  if (!aanwijzers.has(e.pointerId) || !gebaar) return;
  aanwijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (gebaar.soort === 'knijp' && aanwijzers.size === 2) {
    const [a, b] = [...aanwijzers.values()];
    const afstand = Math.hypot(a.x - b.x, a.y - b.y);
    const midden = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const r = svg.getBoundingClientRect();
    beeld.x += midden.x - gebaar.midden.x;
    beeld.y += midden.y - gebaar.midden.y;
    zoom(afstand / gebaar.afstand, midden.x - r.left, midden.y - r.top);
    gebaar.afstand = afstand;
    gebaar.midden = midden;
    return;
  }

  if (gebaar.soort === 'schuif') {
    const dx = e.clientX - gebaar.start.x;
    const dy = e.clientY - gebaar.start.y;
    if (Math.hypot(dx, dy) > 4) gebaar.bewogen = true;
    beeld.x = gebaar.bx + dx;
    beeld.y = gebaar.by + dy;
    wereld.setAttribute('transform', `translate(${beeld.x} ${beeld.y}) scale(${beeld.schaal})`);
    return;
  }

  const p = naarWereld(e.clientX, e.clientY);
  const i = gebaar.item;
  if (gebaar.soort === 'sleep') {
    const stap = i.t === 'plant' ? 5 : 10;
    const nx = klem(rond(gebaar.x + p.x - gebaar.start.x, stap), 0, Math.max(0, ontwerp.breedte - i.w));
    const ny = klem(rond(gebaar.y + p.y - gebaar.start.y, stap), 0, Math.max(0, ontwerp.lengte - i.h));
    if (nx !== i.x || ny !== i.y) {
      i.x = nx;
      i.y = ny;
      gebaar.veranderd = true;
      laagItems.querySelector(`[data-id="${i.id}"]`)?.setAttribute('transform', `translate(${i.x} ${i.y})`);
      tekenBoven();
    }
  } else if (gebaar.soort === 'maat') {
    const stap = i.t === 'plant' ? PLANT[i.p].ruimte : 10;
    const min = i.t === 'plant' ? PLANT[i.p].ruimte : ONDERDELEN[i.t].min;
    let nw = klem(Math.max(min, rond(gebaar.w + p.x - gebaar.start.x, stap)), min, ontwerp.breedte - i.x);
    let nh = klem(Math.max(min, rond(gebaar.h + p.y - gebaar.start.y, stap)), min, ontwerp.lengte - i.y);
    if (ONDERDELEN[i.t]?.rond) nw = nh = Math.min(Math.max(nw, nh), ontwerp.breedte - i.x, ontwerp.lengte - i.y);
    if (nw !== i.w || nh !== i.h) {
      i.w = nw;
      i.h = nh;
      gebaar.veranderd = true;
      tekenItemOpnieuw(i);
      tekenBoven();
      werkSelectieMaatBij();
    }
  }
});

function afronden() {
  if (gebaar?.veranderd) {
    onthoud(gebaar.voor);
    opslaan();
    tekenItems();
  }
}

function loslaten(e) {
  aanwijzers.delete(e.pointerId);
  if (!gebaar) return;
  if (gebaar.soort === 'schuif' && !gebaar.bewogen) kies(null);
  if (gebaar.soort === 'schuif') tekenBoven();
  afronden();
  svg.classList.remove('slepen');
  gebaar = aanwijzers.size ? { soort: 'wacht' } : null;
}
svg.addEventListener('pointerup', loslaten);
svg.addEventListener('pointercancel', loslaten);

svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

document.getElementById('inzoomen').addEventListener('click', () => zoom(1.4));
document.getElementById('uitzoomen').addEventListener('click', () => zoom(1 / 1.4));
document.getElementById('passend').addEventListener('click', passend);

knopTerug.addEventListener('click', () => {
  const vorige = geschiedenis.pop();
  if (!vorige) return;
  ontwerp = JSON.parse(vorige);
  opslaan();
  if (!gekozen()) kies(null);
  tekenTuin();
  tekenItems();
  kies(selectieId);
  knopTerug.disabled = geschiedenis.length === 0;
  meld('Stap teruggezet');
});
knopTerug.disabled = true;

// ---------- Toevoegen ----------

function middenVanBeeld() {
  const r = svg.getBoundingClientRect();
  return naarWereld(r.left + r.width / 2, r.top + r.height / 2);
}

function plaats(item) {
  item.w = Math.min(item.w, ontwerp.breedte);
  item.h = Math.min(item.h, ontwerp.lengte);
  const m = middenVanBeeld();
  item.x = klem(rond(m.x - item.w / 2, 10), 0, ontwerp.breedte - item.w);
  item.y = klem(rond(m.y - item.h / 2, 10), 0, ontwerp.lengte - item.h);
  onthoud();
  ontwerp.items.push(item);
  opslaan();
  tekenItems();
  kies(item.id);
}

function voegOnderdeelToe(t) {
  const o = ONDERDELEN[t];
  plaats({ id: nieuwId(), t, x: 0, y: 0, w: o.w, h: o.h });
  meld(`${o.naam} geplaatst. Sleep om te verplaatsen.`);
}

function standaardVak(id) {
  const r = PLANT[id].ruimte;
  const n = Math.max(1, Math.round(60 / r));
  return { w: r * n, h: r * n };
}

function voegPlantToe(id) {
  const { w, h } = standaardVak(id);
  plaats({ id: nieuwId(), t: 'plant', p: id, x: 0, y: 0, w, h });
  bewaar('moestuin.laatsteActie', { tekst: `${PLANT[id].naam} ingepland`, wanneer: Date.now() });
  meld('Sleep het rondje rechtsonder om het vak groter te maken.');
}

// Een bak of bed in één keer beplanten met de juiste plantafstand
function beplant(bak, id) {
  const r = PLANT[id].ruimte;
  const rand = (ONDERDELEN[bak.t].rand || 0) + 5;
  const binnenW = bak.w - 2 * rand;
  const binnenH = bak.h - 2 * rand;
  if (binnenW < r || binnenH < r) {
    meld(`${PLANT[id].naam} heeft ${r} cm ruimte nodig, dat past hier niet.`);
    return;
  }
  const w = Math.floor(binnenW / r) * r;
  const h = Math.floor(binnenH / r) * r;
  onthoud();
  const vak = { id: nieuwId(), t: 'plant', p: id, x: rond(bak.x + (bak.w - w) / 2, 1), y: rond(bak.y + (bak.h - h) / 2, 1), w, h };
  ontwerp.items.push(vak);
  opslaan();
  bewaar('moestuin.laatsteActie', { tekst: `${PLANT[id].naam} ingepland`, wanneer: Date.now() });
  tekenItems();
  kies(vak.id);
  const n = aantalPlanten(vak);
  meld(`${n} ${n === 1 ? 'plant' : 'planten'} ${PLANT[id].naam.toLowerCase()} ingepland`);
}

// ---------- Selectie-acties ----------

document.getElementById('sel-klaar').addEventListener('click', () => kies(null));
document.getElementById('sel-weg').addEventListener('click', () => {
  const sel = gekozen();
  if (!sel) return;
  onthoud();
  ontwerp.items = ontwerp.items.filter((i) => i !== sel);
  opslaan();
  kies(null);
  tekenItems();
  meld(`${naamVan(sel)} weggehaald. Terug met de pijl bovenin.`);
});
document.getElementById('sel-kopie').addEventListener('click', () => {
  const sel = gekozen();
  if (!sel) return;
  const kopie = { ...sel, id: nieuwId() };
  kopie.x = klem(sel.x + 20, 0, ontwerp.breedte - sel.w);
  kopie.y = klem(sel.y + 20, 0, ontwerp.lengte - sel.h);
  onthoud();
  ontwerp.items.push(kopie);
  opslaan();
  tekenItems();
  kies(kopie.id);
});
document.getElementById('sel-draai').addEventListener('click', () => {
  const sel = gekozen();
  if (!sel) return;
  onthoud();
  const cx = sel.x + sel.w / 2;
  const cy = sel.y + sel.h / 2;
  [sel.w, sel.h] = [Math.min(sel.h, ontwerp.breedte), Math.min(sel.w, ontwerp.lengte)];
  sel.x = klem(rond(cx - sel.w / 2, 5), 0, ontwerp.breedte - sel.w);
  sel.y = klem(rond(cy - sel.h / 2, 5), 0, ontwerp.lengte - sel.h);
  opslaan();
  tekenItems();
  kies(sel.id);
});
document.getElementById('sel-info').addEventListener('click', () => {
  const sel = gekozen();
  if (sel?.t === 'plant') openPlantinfo(sel.p, sel);
});
document.getElementById('sel-beplant').addEventListener('click', () => {
  const sel = gekozen();
  if (sel) openCatalogus('planten', (id) => beplant(sel, id), `Wat komt er in ${naamVan(sel).toLowerCase()}?`);
});

// ---------- Onderblad ----------

const blad = document.getElementById('blad');
const bladAchter = document.getElementById('blad-achtergrond');
let vorigeFocus = null;
function openBlad(titel, inhoud, icoon) {
  vorigeFocus = document.activeElement;
  const kop = document.getElementById('blad-titel');
  kop.replaceChildren();
  if (icoon) kop.append(spriteImg(icoon, 32));
  kop.append(document.createTextNode(titel));
  const doel = document.getElementById('blad-inhoud');
  doel.replaceChildren(...[].concat(inhoud));
  doel.scrollTop = 0;
  blad.hidden = false;
  bladAchter.hidden = false;
  document.getElementById('blad-sluit').focus({ preventScroll: true });
}
function sluitBlad() {
  blad.hidden = true;
  bladAchter.hidden = true;
  vorigeFocus?.focus?.({ preventScroll: true });
}
document.getElementById('blad-sluit').addEventListener('click', sluitBlad);
bladAchter.addEventListener('click', sluitBlad);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !blad.hidden) sluitBlad();
  else if ((e.key === 'Delete' || e.key === 'Backspace') && gekozen() && blad.hidden && document.activeElement === document.body) document.getElementById('sel-weg').click();
});

// Klein plaatje van een onderdeel voor de catalogus
function onderdeelIcoon(t) {
  const o = ONDERDELEN[t];
  const groot = Math.max(o.w, o.h);
  const ic = s('svg', { viewBox: `${-groot * 0.08} ${-groot * 0.08} ${groot * 1.16} ${groot * 1.16}`, 'aria-hidden': 'false', role: 'img' });
  ic.setAttribute('aria-label', '');
  const item = { id: 'voorbeeld', t, x: (groot - o.w) / 2, y: (groot - o.h) / 2, w: o.w, h: o.h };
  ic.append(tekenItem(item));
  return ic;
}

let catalogusTab = 'inrichting';
let plantFilter = 'alles';
function openCatalogus(tab = catalogusTab, opKeuze = null, titel = 'Toevoegen aan je tuin') {
  const alleenPlanten = !!opKeuze;
  catalogusTab = alleenPlanten ? 'planten' : tab;
  const tabs = el('div', 'tabs');
  const raster = el('div', 'catalogus');
  const uitleg = el('p', 'uitleg');

  const vul = () => {
    tabs.replaceChildren();
    const opties = alleenPlanten ? [] : [['inrichting', 'Bakken & paden']];
    opties.push(['alles', 'Alle planten'], ['groente', 'Groente'], ['fruit', 'Fruit'], ['kruid', 'Kruiden & bloemen'], ['nu', 'Nu zaaien']);
    opties.forEach(([f, label]) => {
      const b = el('button', 'tab', label);
      b.type = 'button';
      const actief = f === 'inrichting' ? catalogusTab === 'inrichting' : catalogusTab === 'planten' && plantFilter === f;
      b.setAttribute('aria-pressed', String(actief));
      b.addEventListener('click', () => {
        if (f === 'inrichting') catalogusTab = 'inrichting';
        else { catalogusTab = 'planten'; plantFilter = f; }
        vul();
      });
      tabs.append(b);
    });

    raster.replaceChildren();
    if (catalogusTab === 'inrichting') {
      CATALOGUS_INRICHTING.forEach((t) => {
        const o = ONDERDELEN[t];
        const b = el('button', 'kaartje');
        b.type = 'button';
        b.append(onderdeelIcoon(t), document.createTextNode(o.naam), el('small', '', o.rond ? `⌀ ${meter(o.w)}` : `${meter(o.w)} × ${meter(o.h)}`));
        b.addEventListener('click', () => { sluitBlad(); voegOnderdeelToe(t); });
        raster.append(b);
      });
      uitleg.textContent = 'Na het plaatsen kun je alles verslepen, groter maken en draaien.';
    } else {
      PLANTEN.filter((p) => {
        if (plantFilter === 'alles') return true;
        if (plantFilter === 'nu') return p.z.includes(DEZE_MAAND);
        if (plantFilter === 'kruid') return p.soort === 'kruid' || p.soort === 'bloem';
        return p.soort === plantFilter;
      }).forEach((p) => {
        const b = el('button', 'kaartje');
        b.type = 'button';
        if (p.z.includes(DEZE_MAAND)) b.classList.add('nu');
        b.append(spriteImg(p.id, 56), document.createTextNode(p.naam), el('small', '', `${p.ruimte} cm per plant`));
        b.addEventListener('click', () => {
          sluitBlad();
          if (opKeuze) opKeuze(p.id);
          else voegPlantToe(p.id);
        });
        raster.append(b);
      });
      if (!raster.children.length) raster.append(el('p', 'leeg', 'Deze maand valt er niets te zaaien.'));
      uitleg.textContent = `Groen = kun je in ${MAAND_LANG[DEZE_MAAND - 1]} zaaien of planten.`;
    }
  };
  vul();
  openBlad(titel, [tabs, raster, uitleg]);
}
document.getElementById('toevoegen').addEventListener('click', () => openCatalogus('inrichting'));

// ---------- Plantinfo ----------

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

function burenLijst(ids, soort, klik) {
  const d = el('div', 'buren');
  ids.forEach((id) => {
    const b = el(klik ? 'button' : 'span', `buur ${soort}`);
    if (klik) { b.type = 'button'; b.addEventListener('click', () => klik(id)); }
    b.append(spriteImg(id, 22), document.createTextNode(PLANT[id].naam));
    d.append(b);
  });
  return d;
}

function openPlantinfo(id, vak = null) {
  const p = PLANT[id];
  const delen = [];
  if (vak) {
    const n = aantalPlanten(vak);
    delen.push(el('p', 'tip', `In dit vak passen ${n} ${n === 1 ? 'plant' : 'planten'} (${meter(vak.w)} × ${meter(vak.h)}, ${p.ruimte} cm per plant).`));
  }
  const dl = el('dl');
  [['Zaaien', p.zaaien], ['Water', p.water], ['Zon', p.zon], ['Afstand', p.afstand]].forEach(([t, w]) => {
    const rij = el('div', 'info-rij');
    rij.append(el('dt', '', t), el('dd', '', w));
    dl.append(rij);
  });
  delen.push(kalender(p), dl, el('p', 'tip', `Tip: ${p.tip}`));

  const goed = PLANTEN.filter((q) => relatie(id, q.id) === 'goed').map((q) => q.id);
  const slecht = PLANTEN.filter((q) => relatie(id, q.id) === 'slecht').map((q) => q.id);
  if (goed.length) delen.push(el('h3', '', 'Goede buren'), burenLijst(goed, 'goed'));
  if (slecht.length) delen.push(el('h3', '', 'Liever niet naast'), burenLijst(slecht, 'slecht'));

  if (vak) {
    const naast = [...new Set(burenVan(vak).map((j) => j.p))];
    delen.push(el('h3', '', 'In jouw tuin ernaast'));
    if (!naast.length) delen.push(el('p', 'leeg', 'Nog geen andere planten ernaast.'));
    else {
      const soort = (q) => relatie(id, q) || '';
      delen.push(burenLijst(naast, '', null));
      delen[delen.length - 1].querySelectorAll('.buur').forEach((b, i) => { const k = soort(naast[i]); if (k) b.classList.add(k); });
      if (naast.some((q) => relatie(id, q) === 'slecht')) delen.push(el('p', 'waarschuwing', 'Een van de buren past niet zo goed. Zet ze wat verder uit elkaar, minstens 20 cm.'));
    }
  }
  openBlad(p.naam, delen, id);
}

// ---------- Plantlijst ----------

document.getElementById('lijst-knop').addEventListener('click', () => {
  const telling = new Map();
  ontwerp.items.filter((i) => i.t === 'plant').forEach((i) => {
    const t = telling.get(i.p) || { aantal: 0, opp: 0, vakken: 0 };
    t.aantal += aantalPlanten(i);
    t.opp += i.w * i.h;
    t.vakken++;
    telling.set(i.p, t);
  });
  const lijst = el('div', 'lijst');
  [...telling.entries()].sort((a, b) => PLANT[a[0]].naam.localeCompare(PLANT[b[0]].naam)).forEach(([id, t]) => {
    const rij = el('button', 'lijst-rij');
    rij.type = 'button';
    const midden = el('span');
    midden.append(el('strong', '', PLANT[id].naam), el('small', '', `${(t.opp / 10000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} m² · ${t.vakken} ${t.vakken === 1 ? 'vak' : 'vakken'}`));
    rij.append(spriteImg(id, 32), midden, el('span', 'aantal', String(t.aantal)));
    rij.addEventListener('click', () => openPlantinfo(id));
    lijst.append(rij);
  });
  const totaal = [...telling.values()].reduce((a, t) => a + t.aantal, 0);
  openBlad('Plantlijst', telling.size
    ? [el('p', 'leeg', `${totaal} planten van ${telling.size} soorten. Handig als boodschappenlijst voor zaad en plantjes.`), el('div', '', ''), lijst]
    : [el('p', 'leeg', 'Je hebt nog niets ingepland. Kies Toevoegen of selecteer een bak en kies Beplant.')]);
});

// ---------- Deze maand ----------

document.getElementById('maand-knop').addEventListener('click', () => {
  const inTuin = [...new Set(ontwerp.items.filter((i) => i.t === 'plant').map((i) => i.p))];
  const groep = (titel, ids, leeg) => {
    const d = el('div');
    d.append(el('h3', '', titel), ids.length ? burenLijst(ids, '', (id) => openPlantinfo(id)) : el('p', 'leeg', leeg));
    return d;
  };
  openBlad(`In ${MAAND_LANG[DEZE_MAAND - 1]}`, [
    groep('Oogsten uit jouw tuin', inTuin.filter((id) => PLANT[id].o.includes(DEZE_MAAND)), inTuin.length ? 'Nog niets te oogsten.' : 'Je hebt nog niets ingepland.'),
    groep('Zaaien of planten uit jouw plan', inTuin.filter((id) => PLANT[id].z.includes(DEZE_MAAND)), 'Niets uit jouw plan.'),
    groep('Ook leuk om nu te zaaien', PLANTEN.filter((p) => !inTuin.includes(p.id) && p.z.includes(DEZE_MAAND)).map((p) => p.id), 'Even rust in de tuin.'),
  ]);
});

// ---------- Tuinmaat ----------

document.getElementById('tuin-knop').addEventListener('click', () => {
  let b = ontwerp.breedte;
  let l = ontwerp.lengte;
  const stapper = (label, waarde, zet) => {
    const rij = el('div', 'maat-rij');
    const st = el('div', 'stapper');
    const min = el('button', '', '−');
    const out = el('output', '', meter(waarde));
    const plus = el('button', '', '+');
    min.type = plus.type = 'button';
    min.setAttribute('aria-label', `${label} kleiner`);
    plus.setAttribute('aria-label', `${label} groter`);
    const pas = (d) => { waarde = klem(waarde + d, 200, 3000); out.textContent = meter(waarde); zet(waarde); };
    min.addEventListener('click', () => pas(-50));
    plus.addEventListener('click', () => pas(50));
    st.append(min, out, plus);
    rij.append(el('strong', '', label), st);
    return rij;
  };
  const toepassen = el('button', 'knop-plat groen', 'Maat aanpassen');
  toepassen.type = 'button';
  toepassen.addEventListener('click', () => {
    if (b !== ontwerp.breedte || l !== ontwerp.lengte) {
      onthoud();
      ontwerp.breedte = b;
      ontwerp.lengte = l;
      ontwerp.items = ontwerp.items.filter((i) => i.x < b && i.y < l);
      ontwerp.items.forEach((i) => {
        i.w = Math.min(i.w, b - i.x);
        i.h = Math.min(i.h, l - i.y);
      });
      opslaan();
      tekenTuin();
      tekenItems();
      passend();
      meld(`Je tuin is nu ${meter(b)} bij ${meter(l)}`);
    }
    sluitBlad();
  });
  const voorbeeld = el('button', 'knop-plat', 'Voorbeeldtuin laden');
  voorbeeld.type = 'button';
  voorbeeld.addEventListener('click', () => {
    onthoud();
    ontwerp = voorbeeldtuin();
    opslaan();
    kies(null);
    tekenTuin();
    tekenItems();
    passend();
    sluitBlad();
  });
  const leeg = el('button', 'knop-plat rood', 'Lege tuin');
  leeg.type = 'button';
  let zeker = false;
  leeg.addEventListener('click', () => {
    if (!zeker) { zeker = true; leeg.textContent = 'Zeker weten? Tik nog een keer'; return; }
    onthoud();
    ontwerp = { breedte: b, lengte: l, items: [] };
    opslaan();
    kies(null);
    tekenTuin();
    tekenItems();
    passend();
    sluitBlad();
    meld('Lege tuin. Begin met Toevoegen.');
  });
  const knoppen = el('div', 'knoppen-rij');
  knoppen.append(toepassen, voorbeeld, leeg);
  openBlad('Hoe groot is je tuin?', [
    el('p', 'leeg', 'Meet je tuin op en vul hier de maten in. De lijnen op de plattegrond staan om de meter.'),
    stapper('Breedte', b, (v) => { b = v; }),
    stapper('Lengte', l, (v) => { l = v; }),
    knoppen,
  ]);
});

// ---------- Start ----------

maakPatronen();
tekenTuin();
tekenItems();
kies(null);
requestAnimationFrame(passend);
window.addEventListener('orientationchange', () => setTimeout(passend, 300));
if (!lees(SLEUTEL, null)) {
  opslaan();
  meld('Dit is een voorbeeldtuin. Tik op iets om het aan te passen.');
}
