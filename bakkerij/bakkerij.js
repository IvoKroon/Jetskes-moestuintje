// De bakkerij: van je oogst uit het spel bak je taarten. Die verkoop je op de markt (markt/)
// voor meer munten dan de losse groente. Voorraad en munten deelt hij met het spel en de markt.
import {
  RECEPTEN, GEWAS_NAMEN, PRIJZEN, BAKKERIJ_PRIJS,
  voorraad, munten, kanBakken, bak, beurs, heeftBakkerij, koopBakkerij,
} from '../spel/spel-markt.js';
import { plaatjeUrl } from '../spel/spel-sprites.js';
import { geluid } from '../spel/spel-geluid.js';

const $ = (id) => document.getElementById(id);
const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wacht = (ms) => new Promise((ok) => setTimeout(ok, rustig ? Math.min(ms, 150) : ms));

const el = (tag, klasse, tekst) => {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
};
const img = (naam, klasse = '') => Object.assign(document.createElement('img'), { src: plaatjeUrl(naam), className: `sprite ${klasse}`.trim(), alt: '' });

/** "1 wortel", "3 wortels", "2 wortelcakes" */
const hoeveel = (n, ding) => {
  const namen = GEWAS_NAMEN[ding] ?? RECEPTEN[ding];
  return `${n} ${n === 1 ? namen.naam.toLowerCase() : namen.meer}`;
};
const losWaard = (recept) => Object.entries(RECEPTEN[recept].nodig).reduce((s, [g, n]) => s + n * (PRIJZEN[g] ?? 1), 0);
const aantalTeBakken = (recept, v) => Math.min(...Object.entries(RECEPTEN[recept].nodig).map(([g, n]) => Math.floor((v[g] ?? 0) / n)));

function tekenDicht() {
  const tekort = BAKKERIJ_PRIJS - munten();
  $('dichtTekst').textContent = tekort > 0
    ? `De bakkerij is nog dicht. Voor ${BAKKERIJ_PRIJS} munten is hij van jou. Je mist nog ${tekort} munten: verkoop je oogst op de markt!`
    : `De bakkerij is nog dicht. Voor ${BAKKERIJ_PRIJS} munten is hij van jou en bak je lekkers van je oogst.`;
  $('dichtBalk').style.width = `${Math.min(munten() / BAKKERIJ_PRIJS, 1) * 100}%`;
  const knop = $('koopBakkerij');
  knop.replaceChildren(img('muntje'), `Koop voor ${BAKKERIJ_PRIJS}`);
  knop.disabled = tekort > 0;
  knop.classList.toggle('groen', tekort <= 0);
}

function tekenOogst(v) {
  const lijst = $('oogst');
  lijst.replaceChildren();
  let iets = false;
  for (const g of Object.keys(GEWAS_NAMEN)) {
    const n = v[g] ?? 0;
    iets ||= n > 0;
    const li = el('li', n ? '' : 'leeg');
    li.append(img(g), el('span', '', `${n}`));
    li.title = hoeveel(n, g);
    lijst.append(li);
  }
  $('geenOogst').hidden = iets;
}

function tekenRecept(recept, v) {
  const r = RECEPTEN[recept];
  const kan = kanBakken(recept, v);
  const li = el('li', `kader recept${kan ? ' kan' : ''}`);

  const kop = el('div', 'recept-kop');
  const plaatje = el('div', 'recept-plaatje');
  plaatje.append(img(recept));
  const klaar = v[recept] ?? 0;
  if (klaar) plaatje.append(el('span', 'stapel', `${klaar}`));
  const naam = el('div', 'recept-naam');
  naam.append(el('strong', '', r.naam), el('small', '', `markt: ${r.prijs} munten`), el('small', 'winst', `los maar ${losWaard(recept)}`));
  kop.append(plaatje, naam);

  // Per ingrediënt: wat je nodig hebt en wat je hebt, met een vinkje of in het rood.
  const nodig = el('ul', 'nodig');
  const tekort = [];
  for (const [g, n] of Object.entries(r.nodig)) {
    const heb = v[g] ?? 0;
    const genoeg = heb >= n;
    if (!genoeg) tekort.push(hoeveel(n - heb, g));
    const rij = el('li', genoeg ? 'genoeg' : 'mist');
    rij.append(img(g), el('span', 'wat', hoeveel(n, g)), el('span', 'heb', `${Math.min(heb, 99)}/${n} ${genoeg ? '✓' : '✗'}`));
    nodig.append(rij);
  }

  const status = el('p', `status${kan ? '' : ' mist'}`);
  if (kan) {
    const x = aantalTeBakken(recept, v);
    status.textContent = x > 1 ? `Je kunt er ${x} bakken!` : 'Je kunt er 1 bakken!';
  } else {
    status.textContent = `Nog nodig: ${tekort.join(' en ')}.`;
  }

  const knop = el('button', `knop breed${kan ? ' groen' : ''}`);
  knop.append(kan ? 'Bak!' : 'Oogst eerst meer');
  knop.disabled = !kan;
  knop.setAttribute('aria-label', kan ? `Bak een ${r.naam.toLowerCase()}` : `${r.naam}: ${status.textContent}`);
  knop.addEventListener('click', () => bakMet(recept));

  li.append(kop, nodig, status, knop);
  return li;
}

function tekenPlank(v) {
  const lijst = $('taarten');
  lijst.replaceChildren();
  let stuks = 0;
  let waard = 0;
  for (const [recept, r] of Object.entries(RECEPTEN)) {
    const n = v[recept] ?? 0;
    if (!n) continue;
    stuks += n;
    waard += n * r.prijs;
    const li = el('li');
    li.append(img(recept), el('span', '', `${n}x`));
    li.title = hoeveel(n, recept);
    lijst.append(li);
  }
  $('plank').hidden = !stuks;
  $('plankTekst').textContent = `Samen ${waard} munten waard. Verkoop ${stuks === 1 ? 'hem' : 'ze'} op de markt!`;
}

function teken() {
  const v = voorraad();
  $('beurs').replaceChildren(beurs());
  const open = heeftBakkerij();
  $('open').hidden = !open;
  $('dicht').hidden = open;
  if (!open) return tekenDicht();
  tekenOogst(v);
  $('recepten').replaceChildren(...Object.keys(RECEPTEN).map((r) => tekenRecept(r, v)));
  tekenPlank(v);
}

// ---------- Bakken, met een oventje ----------

let bezig = false;
let huidig = null;
let terugFocus = null;

async function bakMet(recept) {
  if (bezig) return;
  if (!bak(recept)) return teken();
  bezig = true;
  huidig = recept;
  const r = RECEPTEN[recept];
  geluid.wakker();

  terugFocus = document.activeElement;
  const scherm = $('bakken');
  scherm.hidden = false;
  document.body.classList.add('vast');
  $('bakTitel').textContent = `${r.naam} bakken`;
  $('bakTekst').textContent = 'Erin met de oogst...';
  $('bakKnoppen').hidden = true;
  $('bakTaart').hidden = true;
  $('bakTaart').src = plaatjeUrl(recept);
  $('bakOven').src = plaatjeUrl('oven');
  $('bakOven').classList.remove('gloei');
  $('glinsters').replaceChildren();
  const balk = $('bakBalk');
  balk.style.transition = 'none';
  balk.style.width = '0%';

  // De ingrediënten vliegen één voor één de oven in
  const vliegers = $('vliegers');
  vliegers.replaceChildren();
  let i = 0;
  for (const [g, n] of Object.entries(r.nodig)) {
    for (let k = 0; k < n; k++, i++) {
      const v = img(g, 'vlieger');
      v.style.setProperty('--i', i);
      v.style.setProperty('--x', `${(i % 2 ? 1 : -1) * (30 + (i % 3) * 18)}px`);
      vliegers.append(v);
      setTimeout(() => geluid.tik(), rustig ? 0 : 120 + i * 160);
    }
  }
  await wacht(260 + i * 160);

  // Oven aan: gloeien en het balkje vult
  $('bakOven').src = plaatjeUrl('ovenAan');
  $('bakOven').classList.add('gloei');
  $('bakTekst').textContent = 'In de oven...';
  void balk.offsetWidth;
  balk.style.transition = `width ${rustig ? 150 : 1400}ms steps(10)`;
  balk.style.width = '100%';
  await wacht(1450);

  // Ping! De taart komt eruit
  $('bakOven').src = plaatjeUrl('oven');
  $('bakOven').classList.remove('gloei');
  vliegers.replaceChildren();
  $('bakTaart').hidden = false;
  for (let g = 0; g < 6; g++) {
    const s = img(g % 2 ? 'glinster' : 'glinsterKlein', 'glinster');
    s.style.setProperty('--hoek', `${g * 60}deg`);
    $('glinsters').append(s);
  }
  geluid.level();
  $('bakTekst').textContent = `${r.naam} is klaar! Op de markt krijg je er ${r.prijs} munten voor.`;
  teken();
  toonKnoppen();
  bezig = false;
}

function toonKnoppen() {
  const v = voorraad();
  const nog = $('nogEen');
  const kan = kanBakken(huidig, v);
  nog.hidden = !kan;
  nog.textContent = kan ? `Nog een ${RECEPTEN[huidig].naam.toLowerCase()}` : '';
  $('bakKnoppen').hidden = false;
  (kan ? nog : $('klaar')).focus();
}

function sluitOven() {
  if (bezig) return;
  $('bakken').hidden = true;
  document.body.classList.remove('vast');
  terugFocus?.isConnected && terugFocus.focus();
}

$('nogEen').addEventListener('click', () => bakMet(huidig));
$('klaar').addEventListener('click', sluitOven);
$('bakken').addEventListener('click', (e) => { if (e.target === $('bakken')) sluitOven(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('bakken').hidden) sluitOven(); });

$('koopBakkerij').addEventListener('click', () => {
  if (!koopBakkerij()) return;
  geluid.wakker();
  geluid.level();
  teken();
  scrollTo({ top: 0, behavior: rustig ? 'auto' : 'smooth' });
});

for (const plaatje of document.querySelectorAll('img[data-sprite]')) plaatje.src = plaatjeUrl(plaatje.dataset.sprite);
teken();
// Terug van de markt (of uit een ander tabblad): voorraad opnieuw lezen
addEventListener('pageshow', () => bezig || teken());
addEventListener('storage', () => bezig || teken());
