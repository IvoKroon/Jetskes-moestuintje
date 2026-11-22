// De markt als eigen pagina: verkoop je oogst en taarten voor munten en koop de katten vrij.
// De voorraad, munten en katten zijn dezelfde als in het spel (localStorage via spel-markt.js).
import { voorraad, munten, eigenKatten, katPrijs, verkoop, koopKat, heeftBakkerij, koopBakkerij, BAKKERIJ_PRIJS, KATTEN, PRIJZEN, RECEPTEN, GEWAS_NAMEN } from '../spel/spel-markt.js';
import { plaatjeUrl, katPlaatje } from '../spel/spel-sprites.js';
import { geluid } from '../spel/spel-geluid.js';

const NAMEN = { ...GEWAS_NAMEN, ...RECEPTEN };
const $ = (id) => document.getElementById(id);
const el = (tag, klasse, tekst) => {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
};
const img = (src, klasse = 'sprite') => Object.assign(document.createElement('img'), { src, className: klasse, alt: '' });
const meervoud = (g, n) => (n === 1 ? NAMEN[g].naam.toLowerCase() : NAMEN[g].meer);

// Kort muntjesgeluid plus een tekstje dat even boven de beurs verschijnt
function plop(tekst) {
  const p = el('span', 'plop', tekst);
  $('beurs').append(p);
  setTimeout(() => p.remove(), 900);
}

function toonBeurs() {
  const b = $('beurs');
  b.replaceChildren(img(plaatjeUrl('muntje')), el('span', '', `${munten()} munten`));
}

function toonKraam() {
  const v = voorraad();
  const lijst = $('kraam');
  lijst.replaceChildren();
  // eerst groente, dan taarten, in de volgorde van de prijslijst
  const soorten = Object.keys(PRIJZEN).filter((g) => v[g] > 0 && NAMEN[g]);
  if (!soorten.length) {
    const li = el('li', 'leeg');
    li.append(img(plaatjeUrl('kiemplant')), el('span', '', 'Nog niks te verkopen. Ga oogsten in het spel!'));
    lijst.append(li);
  }
  for (const g of soorten) {
    const n = v[g];
    const totaal = n * PRIJZEN[g];
    const li = el('li');
    const wat = el('div', 'wat');
    wat.append(el('strong', '', `${n} ${meervoud(g, n)}`), el('small', '', `${PRIJZEN[g]} per stuk`));
    const knop = el('button', 'knop klein groen');
    knop.append(`+${totaal}`, img(plaatjeUrl('muntje')));
    knop.setAttribute('aria-label', `Verkoop ${n} ${meervoud(g, n)} voor ${totaal} munten`);
    knop.addEventListener('click', () => {
      const opbrengst = verkoop(g);
      geluid.wakker();
      geluid.hartje();
      plop(`+${opbrengst}`);
      toonAlles();
    });
    li.append(img(plaatjeUrl(g)), wat, knop);
    lijst.append(li);
  }
  $('allesKnop').hidden = soorten.length < 2;
}

function toonKatten() {
  const lijst = $('katten');
  lijst.replaceChildren();
  const eigen = eigenKatten();
  const prijs = katPrijs();
  for (const [soort, info] of Object.entries(KATTEN)) {
    const heeft = eigen.includes(soort);
    const li = el('li', heeft ? 'van-jou' : '');
    const foto = img(katPlaatje(soort, heeft ? 'zit' : 'loop1').toDataURL(), `sprite kat${heeft ? '' : ' op-slot'}`);
    const wie = el('div', 'wie');
    wie.append(el('strong', '', info.naam), el('small', '', heeft ? 'Van jou! Loopt over je schutting.' : info.tekst));
    li.append(foto, wie);
    if (!heeft) {
      const kan = munten() >= prijs;
      const knop = el('button', `knop klein${kan ? ' groen' : ''}`);
      knop.append(img(plaatjeUrl('muntje')), `${prijs}`);
      knop.disabled = !kan;
      knop.setAttribute('aria-label', `Koop ${info.naam} voor ${prijs} munten`);
      knop.addEventListener('click', () => {
        if (!koopKat(soort)) return;
        geluid.wakker();
        geluid.miauw();
        plop(`-${prijs}`);
        toonAlles();
      });
      li.append(knop);
    }
    lijst.append(li);
  }
}

// Zolang de bakkerij op slot zit, koop je hem hier vrij; daarna wordt het een gewone link.
function toonBakkerij() {
  const plek = $('bakkerijPlek');
  plek.replaceChildren();
  if (heeftBakkerij()) {
    const a = el('a', 'knop breed');
    a.href = '../bakkerij/';
    a.append(img(plaatjeUrl('aardbeientaart')), 'Naar de bakkerij');
    plek.append(a);
    return;
  }
  const kan = munten() >= BAKKERIJ_PRIJS;
  const blok = el('div', 'kader slot');
  const rij = el('div', 'slot-rij');
  const wat = el('div', 'wat');
  wat.append(el('strong', '', 'Bakkerij op slot'), el('small', '', kan ? 'Open hem en bak taarten van je oogst.' : `Spaar ${BAKKERIJ_PRIJS} munten om hem te openen.`));
  const knop = el('button', `knop klein${kan ? ' groen' : ''}`);
  knop.append(img(plaatjeUrl('muntje')), `${BAKKERIJ_PRIJS}`);
  knop.disabled = !kan;
  knop.setAttribute('aria-label', `Open de bakkerij voor ${BAKKERIJ_PRIJS} munten`);
  knop.addEventListener('click', () => {
    if (!koopBakkerij()) return;
    geluid.wakker();
    geluid.level();
    plop(`-${BAKKERIJ_PRIJS}`);
    toonAlles();
  });
  rij.append(img(plaatjeUrl('slot')), wat, knop);
  blok.append(rij);
  plek.append(blok);
}

function toonAlles() {
  toonBeurs();
  toonBakkerij();
  toonKraam();
  toonKatten();
}

$('allesKnop').addEventListener('click', () => {
  const v = voorraad();
  let opbrengst = 0;
  for (const g of Object.keys(PRIJZEN)) if (v[g] > 0) opbrengst += verkoop(g);
  geluid.wakker();
  geluid.level();
  plop(`+${opbrengst}`);
  toonAlles();
});

// Rood-witte marktluifel in pixels
function tekenLuifel() {
  const c = $('luifel');
  const w = 40, h = 7;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let x = 0; x < w; x++) {
    ctx.fillStyle = Math.floor(x / 5) % 2 ? '#fff6d9' : '#e43b44';
    const diep = x % 5 === 2 ? h : h - 1; // geschulpte onderrand
    ctx.fillRect(x, 0, 1, diep);
  }
  ctx.fillStyle = '#2b1d14';
  ctx.fillRect(0, 0, w, 1);
}

// Komt ze terug van het spel (of een ander tabblad), dan meteen de nieuwe oogst laten zien
window.addEventListener('pageshow', toonAlles);
window.addEventListener('storage', toonAlles);

for (const i of document.querySelectorAll('img[data-sprite]')) i.src = plaatjeUrl(i.dataset.sprite);
tekenLuifel();
toonAlles();
