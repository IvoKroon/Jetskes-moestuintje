// De bakkerij: van je oogst uit het spel bak je taarten. Die verkoop je op de markt (markt/)
// voor meer munten dan de losse groente. Voorraad en munten deelt hij met het spel en de markt.
import { RECEPTEN, BAKKERIJ_PRIJS, voorraad, munten, kanBakken, bak, beurs, heeftBakkerij, koopBakkerij } from '../spel/spel-markt.js';
import { plaatjeUrl } from '../spel/spel-sprites.js';
import { geluid } from '../spel/spel-geluid.js';

const $ = (id) => document.getElementById(id);

const el = (tag, klasse, tekst) => {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
};
const img = (naam) => Object.assign(document.createElement('img'), { src: plaatjeUrl(naam), className: 'sprite', alt: '' });

function teken() {
  const v = voorraad();
  $('beurs').replaceChildren(beurs());

  // Eerst kopen: zolang de bakkerij dicht is, zie je alleen wat hij kost
  const open = heeftBakkerij();
  $('open').hidden = !open;
  $('dicht').hidden = open;
  if (!open) {
    const tekort = BAKKERIJ_PRIJS - munten();
    $('dichtTekst').textContent = tekort > 0
      ? `De bakkerij is nog dicht. Voor ${BAKKERIJ_PRIJS} munten is hij van jou. Je mist nog ${tekort} munten: verkoop je oogst op de markt!`
      : `De bakkerij is nog dicht. Voor ${BAKKERIJ_PRIJS} munten is hij van jou en bak je taarten van je oogst.`;
    const knop = $('koopBakkerij');
    knop.replaceChildren(img('muntje'), `Koop voor ${BAKKERIJ_PRIJS}`);
    knop.disabled = tekort > 0;
    knop.classList.toggle('groen', tekort <= 0);
    return;
  }

  const taarten = Object.keys(RECEPTEN).reduce((n, r) => n + (v[r] ?? 0), 0);
  $('uitleg').textContent = taarten
    ? `Je hebt ${taarten} ${taarten === 1 ? 'taart' : 'taarten'} klaarstaan. Verkoop ze op de markt!`
    : 'Bak een taart van je oogst. Op de markt levert hij meer op dan de losse groente.';

  const lijst = $('recepten');
  lijst.replaceChildren();
  for (const [recept, r] of Object.entries(RECEPTEN)) {
    const li = el('li');
    const wat = el('div', 'wat');
    const klaar = v[recept] ?? 0;
    wat.append(
      el('strong', '', r.naam),
      el('small', '', `verkoop voor ${r.prijs} munten${klaar ? ` · ${klaar} klaar` : ''}`),
    );
    // per ingrediënt: wat je hebt van wat je nodig hebt; rood als je nog iets mist
    const nodig = el('div', 'nodig');
    for (const [g, n] of Object.entries(r.nodig)) {
      const heb = Math.min(v[g] ?? 0, n);
      const stukje = el('span', heb >= n ? 'genoeg' : 'mist');
      stukje.append(img(g), `${heb}/${n}`);
      nodig.append(stukje);
    }
    wat.append(nodig);

    const kan = kanBakken(recept, v);
    const knop = el('button', `knop${kan ? ' groen' : ''}`, 'Bak');
    knop.disabled = !kan;
    knop.setAttribute('aria-label', `Bak een ${r.naam.toLowerCase()}`);
    knop.addEventListener('click', () => {
      if (!bak(recept)) return;
      geluid.wakker();
      geluid.level();
      teken();
    });
    li.append(img(recept), wat, knop);
    lijst.append(li);
  }
}

$('koopBakkerij').addEventListener('click', () => {
  if (!koopBakkerij()) return;
  geluid.wakker();
  geluid.level();
  teken();
});

for (const plaatje of document.querySelectorAll('img[data-sprite]')) plaatje.src = plaatjeUrl(plaatje.dataset.sprite);
teken();
// Terug van de markt (of uit een ander tabblad): voorraad opnieuw lezen
window.addEventListener('pageshow', teken);
