// De markt: verkoop je oogst voor munten en koop daarmee de katten vrij.
// De bakkerij (eigen scherm): bak taarten van je oogst, die je op de markt verkoopt.
// Alles wordt op het apparaat bewaard (los van de online highscore, die alleen over de score gaat).
import { lees, bewaar } from '../shared/opslag.js';
import { plaatjeUrl, katPlaatje } from './spel-sprites.js';
import { geluid } from './spel-geluid.js';

// Muntjes per stuk groente of fruit
const GROENTE_PRIJZEN = { radijs: 1, wortel: 2, tomaat: 3, aardbei: 4, pompoen: 8 };

// De bakkerij: van een paar producten bak je een taart die meer oplevert dan de losse producten.
export const RECEPTEN = {
  wortelcake: { naam: 'Wortelcake', meer: 'wortelcakes', nodig: { wortel: 3 }, prijs: 12 },
  tomatenquiche: { naam: 'Tomatenquiche', meer: 'tomatenquiches', nodig: { tomaat: 2, radijs: 2 }, prijs: 15 },
  aardbeientaart: { naam: 'Aardbeientaart', meer: 'aardbeientaarten', nodig: { aardbei: 3 }, prijs: 20 },
  pompoentaart: { naam: 'Pompoentaart', meer: 'pompoentaarten', nodig: { pompoen: 1, wortel: 2 }, prijs: 22 },
};

export const PRIJZEN = {
  ...GROENTE_PRIJZEN,
  ...Object.fromEntries(Object.entries(RECEPTEN).map(([k, r]) => [k, r.prijs])),
};

export const KATTEN = {
  cyperse: { naam: 'Dexter', tekst: 'Rode cyperse kat. Graaft graag naar schatten.' },
  zwartwit: { naam: 'Willem', tekst: 'Zwart-witte kat met een aureooltje. Een echte engel.' },
};

// De eerste kat is snel te verdienen, de tweede kost wat meer.
const KAT_PRIJZEN = [30, 75];

export const voorraad = () => lees('spel.voorraad', {}) ?? {};
export const munten = () => lees('spel.munten', 0) ?? 0;
export const eigenKatten = () => (lees('spel.katten', []) ?? []).filter((k) => KATTEN[k]);
const katPrijs = () => KAT_PRIJZEN[Math.min(eigenKatten().length, KAT_PRIJZEN.length - 1)];

/** Na elke oogst: één stuk erbij in de voorraad. */
export function bewaarOogst(gewas) {
  const v = voorraad();
  v[gewas] = (v[gewas] ?? 0) + 1;
  bewaar('spel.voorraad', v);
}

function verkoop(gewas) {
  const v = voorraad();
  const aantal = v[gewas] ?? 0;
  if (!aantal) return 0;
  delete v[gewas];
  bewaar('spel.voorraad', v);
  const opbrengst = aantal * (PRIJZEN[gewas] ?? 1);
  bewaar('spel.munten', munten() + opbrengst);
  return opbrengst;
}

function kanBakken(recept, v = voorraad()) {
  return Object.entries(RECEPTEN[recept].nodig).every(([g, n]) => (v[g] ?? 0) >= n);
}

function bak(recept) {
  const v = voorraad();
  if (!kanBakken(recept, v)) return false;
  for (const [g, n] of Object.entries(RECEPTEN[recept].nodig)) {
    v[g] -= n;
    if (!v[g]) delete v[g];
  }
  v[recept] = (v[recept] ?? 0) + 1;
  bewaar('spel.voorraad', v);
  return true;
}

function koopKat(soort) {
  const prijs = katPrijs();
  if (eigenKatten().includes(soort) || munten() < prijs) return false;
  bewaar('spel.munten', munten() - prijs);
  bewaar('spel.katten', [...eigenKatten(), soort]);
  return true;
}

const el = (tag, klasse, tekst) => {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
};
const img = (src, klasse = 'sprite') => Object.assign(document.createElement('img'), { src, className: klasse, alt: '' });

function beurs() {
  const p = el('p', 'beurs');
  p.append(img(plaatjeUrl('muntje')), el('span', '', `${munten()} munten`));
  return p;
}

/**
 * Tekent de markt in het gegeven element.
 * `namen` geeft per gewas { naam, meer } voor de tekstjes.
 */
export function toonMarkt(doel, gewasNamen) {
  const namen = { ...gewasNamen, ...RECEPTEN };
  const v = voorraad();
  doel.replaceChildren(beurs());

  // --- groentekraam ---
  doel.append(el('h3', '', 'Jouw kraam'));
  const lijst = el('ul', 'kraam');
  const soorten = Object.keys(PRIJZEN).filter((g) => v[g] > 0); // groente en taarten
  if (!soorten.length) lijst.append(el('li', 'leeg', 'Nog niks te verkopen. Ga oogsten!'));
  for (const g of soorten) {
    const li = el('li');
    const n = v[g];
    const knop = el('button', 'knop klein groen', `+${n * PRIJZEN[g]}`);
    knop.setAttribute('aria-label', `Verkoop voor ${n * PRIJZEN[g]} munten`);
    knop.addEventListener('click', () => {
      verkoop(g);
      geluid.wakker();
      geluid.hartje();
      toonMarkt(doel, gewasNamen);
    });
    li.append(img(plaatjeUrl(g)), el('span', 'wat', `${n} ${n === 1 ? namen[g].naam.toLowerCase() : namen[g].meer}`), knop);
    lijst.append(li);
  }
  doel.append(lijst);
  if (soorten.length > 1) {
    const alles = el('button', 'knop groen breed', 'Verkoop alles');
    alles.addEventListener('click', () => {
      for (const g of soorten) verkoop(g);
      geluid.wakker();
      geluid.level();
      toonMarkt(doel, gewasNamen);
    });
    doel.append(alles);
  }

  // --- katten ---
  doel.append(el('h3', '', 'Katten'));
  const katten = el('ul', 'katten');
  const eigen = eigenKatten();
  const prijs = katPrijs();
  for (const [soort, info] of Object.entries(KATTEN)) {
    const li = el('li');
    const heeft = eigen.includes(soort);
    const foto = img(katPlaatje(soort, heeft ? 'zit' : 'loop1').toDataURL(), `sprite kat${heeft ? '' : ' op-slot'}`);
    const tekst = el('div', 'wie');
    tekst.append(el('strong', '', info.naam), el('small', '', heeft ? 'Loopt over je schutting!' : info.tekst));
    li.append(foto, tekst);
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
        toonMarkt(doel, gewasNamen);
      });
      li.append(knop);
    }
    katten.append(li);
  }
  doel.append(katten);
}

/** Tekent de bakkerij: van je oogst bak je taarten, die je daarna op de markt verkoopt. */
export function toonBakkerij(doel) {
  const v = voorraad();
  doel.replaceChildren(beurs());
  const taarten = Object.keys(RECEPTEN).reduce((n, r) => n + (v[r] ?? 0), 0);
  doel.append(el('p', 'bak-uitleg', taarten
    ? `Je hebt ${taarten} ${taarten === 1 ? 'taart' : 'taarten'} klaarstaan. Verkoop ze op de markt!`
    : 'Bak een taart van je oogst. Op de markt levert hij meer op dan de losse groente.'));
  const bakkerij = el('ul', 'bakkerij');
  for (const [recept, r] of Object.entries(RECEPTEN)) {
    const li = el('li');
    const wat = el('div', 'wat');
    wat.append(el('strong', '', `${r.naam}`), el('small', '', `verkoop voor ${r.prijs} munten`));
    // per ingrediënt: wat je hebt van wat je nodig hebt; rood als je nog iets mist
    const nodig = el('div', 'nodig');
    for (const [g, n] of Object.entries(r.nodig)) {
      const heb = Math.min(v[g] ?? 0, n);
      const stukje = el('span', heb >= n ? 'genoeg' : 'mist');
      stukje.append(img(plaatjeUrl(g)), `${heb}/${n}`);
      nodig.append(stukje);
    }
    wat.append(nodig);
    const kan = kanBakken(recept, v);
    const knop = el('button', `knop klein${kan ? ' groen' : ''}`, 'Bak');
    knop.disabled = !kan;
    knop.setAttribute('aria-label', `Bak een ${r.naam.toLowerCase()}`);
    knop.addEventListener('click', () => {
      if (!bak(recept)) return;
      geluid.wakker();
      geluid.level();
      toonBakkerij(doel);
    });
    li.append(img(plaatjeUrl(recept)), wat, knop);
    bakkerij.append(li);
  }
  doel.append(bakkerij);
}
