// Gedeelde logica van het spel, de markt (markt/) en de bakkerij (bakkerij/):
// je oogst gaat in de voorraad, op de markt verkoop je hem voor munten en koop je de katten,
// in de bakkerij bak je er taarten van.
// Alles wordt op het apparaat bewaard (los van de online highscore, die alleen over de score gaat).
import { lees, bewaar } from '../shared/opslag.js';
import { plaatjeUrl } from './spel-sprites.js';

/** Namen per gewas voor de tekstjes: één radijs, twee radijsjes. */
export const GEWAS_NAMEN = {
  graan: { naam: 'Graan', meer: 'graan' },
  radijs: { naam: 'Radijs', meer: 'radijsjes' },
  wortel: { naam: 'Wortel', meer: 'wortels' },
  tomaat: { naam: 'Tomaat', meer: 'tomaten' },
  aardbei: { naam: 'Aardbei', meer: 'aardbeien' },
  pompoen: { naam: 'Pompoen', meer: 'pompoenen' },
  // alleen te plukken tijdens de vlierbes frenzy
  vlierbes: { naam: 'Vlierbes', meer: 'vlierbessen' },
};

// Muntjes per stuk groente of fruit
// Graan is goedkoop: er groeit veel van. Vlierbessen pluk je met honderden tegelijk,
// die zijn nog veel minder waard: 10 vlierbessen = 1 munt.
const GROENTE_PRIJZEN = { graan: 1, radijs: 2, wortel: 2, tomaat: 3, aardbei: 4, pompoen: 8, vlierbes: 0.1 };

// De bakkerij: graan is de basis van alles; met wat oogst erbij bak je iets dat meer oplevert dan de losse producten.
export const RECEPTEN = {
  brood: { naam: 'Brood', meer: 'broden', nodig: { graan: 4 }, prijs: 8 },
  vlaai: { naam: 'Vlaai', meer: 'vlaaien', nodig: { graan: 2, aardbei: 5 }, prijs: 32 },
  wortelcake: { naam: 'Wortelcake', meer: 'wortelcakes', nodig: { graan: 2, wortel: 3 }, prijs: 14 },
  tomatenquiche: { naam: 'Tomatenquiche', meer: 'tomatenquiches', nodig: { graan: 2, tomaat: 2, radijs: 2 }, prijs: 18 },
  aardbeientaart: { naam: 'Aardbeientaart', meer: 'aardbeientaarten', nodig: { graan: 2, aardbei: 3 }, prijs: 22 },
  pompoentaart: { naam: 'Pompoentaart', meer: 'pompoentaarten', nodig: { graan: 2, pompoen: 1, wortel: 2 }, prijs: 24 },
  // Jam van de frenzy-vlierbessen, zonder graan. Heel weinig waard, maar net iets meer dan de losse bessen.
  vlierbesjam: { naam: 'Vlierbesjam', meer: 'potjes vlierbesjam', nodig: { vlierbes: 20 }, prijs: 3 },
};

export const PRIJZEN = {
  ...GROENTE_PRIJZEN,
  ...Object.fromEntries(Object.entries(RECEPTEN).map(([k, r]) => [k, r.prijs])),
};

export const KATTEN = {
  cyperse: { naam: 'Dexter', tekst: 'Rode cyperse kat. Graaft graag naar schatten.' },
  zwartwit: { naam: 'Willem', tekst: 'Zwart-witte kat met een aureooltje. Een echte engel.' },
};

// De katten zijn een flink spaardoel, elk met een vaste prijs: Dexter eerst, Willem kost veel meer.
const KAT_PRIJZEN = { cyperse: 100, zwartwit: 250 };

// De bakkerij moet je eerst kopen voordat je er taarten kunt bakken.
export const BAKKERIJ_PRIJS = 50;

export const voorraad = () => lees('spel.voorraad', {}) ?? {};
export const munten = () => lees('spel.munten', 0) ?? 0;
export const eigenKatten = () => (lees('spel.katten', []) ?? []).filter((k) => KATTEN[k]);
export const heeftBakkerij = () => lees('spel.bakkerij', false) === true;
export const katPrijs = (soort) => KAT_PRIJZEN[soort];

/** Na elke oogst: één stuk (of bij de vlierbessen meteen een heel trosje) erbij in de voorraad. */
export function bewaarOogst(gewas, aantal = 1) {
  const v = voorraad();
  v[gewas] = (v[gewas] ?? 0) + aantal;
  bewaar('spel.voorraad', v);
}

/** Wat je nu voor een soort krijgt. Bij goedkope dingen (minder dan 1 munt per stuk) alleen hele munten. */
export function opbrengstVan(gewas, aantal) {
  return Math.floor(aantal * (PRIJZEN[gewas] ?? 1) + 1e-9);
}

/** "8 per stuk" of "5 voor 1 munt" */
export function prijsTekst(gewas) {
  const prijs = PRIJZEN[gewas] ?? 1;
  return prijs >= 1 ? `${prijs} per stuk` : `${Math.round(1 / prijs)} voor 1 munt`;
}

export function verkoop(gewas) {
  const v = voorraad();
  const aantal = v[gewas] ?? 0;
  const opbrengst = opbrengstVan(gewas, aantal);
  if (!opbrengst) return 0;
  // wat niet een hele munt oplevert (bijv. 3 vlierbessen) blijft in de voorraad
  const prijs = PRIJZEN[gewas] ?? 1;
  const over = prijs >= 1 ? 0 : aantal - Math.round(opbrengst / prijs);
  if (over > 0) v[gewas] = over;
  else delete v[gewas];
  bewaar('spel.voorraad', v);
  bewaar('spel.munten', munten() + opbrengst);
  return opbrengst;
}

export function kanBakken(recept, v = voorraad()) {
  return Object.entries(RECEPTEN[recept].nodig).every(([g, n]) => (v[g] ?? 0) >= n);
}

export function bak(recept) {
  const v = voorraad();
  if (!heeftBakkerij() || !kanBakken(recept, v)) return false;
  for (const [g, n] of Object.entries(RECEPTEN[recept].nodig)) {
    v[g] -= n;
    if (!v[g]) delete v[g];
  }
  v[recept] = (v[recept] ?? 0) + 1;
  bewaar('spel.voorraad', v);
  return true;
}

/** Koopt de bakkerij voor BAKKERIJ_PRIJS munten. Geeft true als het gelukt is. */
export function koopBakkerij() {
  if (heeftBakkerij() || munten() < BAKKERIJ_PRIJS) return false;
  bewaar('spel.munten', munten() - BAKKERIJ_PRIJS);
  bewaar('spel.bakkerij', true);
  return true;
}

export function koopKat(soort) {
  const prijs = katPrijs(soort);
  if (!prijs || eigenKatten().includes(soort) || munten() < prijs) return false;
  bewaar('spel.munten', munten() - prijs);
  bewaar('spel.katten', [...eigenKatten(), soort]);
  return true;
}

/** Het regeltje met je munten bovenaan de markt en de bakkerij. */
export function beurs() {
  const p = document.createElement('p');
  p.className = 'beurs';
  const muntje = Object.assign(document.createElement('img'), { src: plaatjeUrl('muntje'), className: 'sprite', alt: '' });
  const tekst = document.createElement('span');
  tekst.textContent = `${munten()} munten`;
  p.append(muntje, tekst);
  return p;
}
