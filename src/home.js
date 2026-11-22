import { sprite } from '../shared/sprites.js';
import { lees } from '../shared/opslag.js';
import { BEGROETING } from './config.js';
import { haalTop, vulLijst } from '../shared/highscore.js';

function el(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}

function render(root) {
  const kop = el('header', 'home-kop');
  const rij = el('div', 'sprites');
  ['wortel', 'tomaat', 'aardbei', 'radijs', 'pompoen'].forEach((naam, i) => {
    const s = sprite(naam, { grootte: 40, klasse: 'wiebel' });
    s.style.animationDelay = `${i * 0.2}s`;
    rij.append(s);
  });
  kop.append(rij, el('h1', '', 'Jetskes moestuintje'));

  const begroeting = el('section', 'kader begroeting');
  begroeting.append(
    el('h2', '', BEGROETING.titel),
    el('p', '', BEGROETING.tekst),
    el('p', 'afzender', BEGROETING.afzender),
  );

  const keuzes = el('div', 'keuzes');
  const spel = el('a', 'knop groen breed');
  spel.href = './spel/';
  const spelTekst = el('span', '', 'Tuinieren');
  spelTekst.append(el('small', '', 'Oogst snel, jaag de beestjes weg'));
  spel.append(sprite('tomaat', { grootte: 40 }), spelTekst);

  const tuin = el('a', 'knop breed');
  tuin.href = './planner/';
  const tuinTekst = el('span', '', 'Plan je moestuintje');
  tuinTekst.append(el('small', '', 'Teken je tuin en houd bij wat je doet'));
  tuin.append(sprite('kiemplant', { grootte: 40 }), tuinTekst);

  const markt = el('a', 'knop oranje breed');
  markt.href = './markt/';
  const marktTekst = el('span', '', 'Markt');
  marktTekst.append(el('small', '', 'Verkoop je oogst voor munten'));
  markt.append(sprite('wortel', { grootte: 40 }), marktTekst);

  // De bakkerij moet eerst in het spel gekocht worden; tot die tijd op slot
  const bakkerijOpen = lees('spel.bakkerij', false) === true;
  const bakkerij = el(bakkerijOpen ? 'a' : 'div', bakkerijOpen ? 'knop breed' : 'knop breed op-slot');
  if (bakkerijOpen) bakkerij.href = './bakkerij/';
  else bakkerij.setAttribute('aria-disabled', 'true');
  const bakkerijTekst = el('span', '', bakkerijOpen ? 'Bakkerij' : 'Bakkerij (op slot)');
  bakkerijTekst.append(
    el('small', '', bakkerijOpen ? 'Bak lekkers van je oogst' : 'Koop hem in het spel voor 50 munten'),
  );
  bakkerij.append(sprite('brood', { grootte: 40 }), bakkerijTekst);

  keuzes.append(spel, tuin, markt, bakkerij);

  // Laatste actie uit de moestuinplanner, alleen als die er is
  const weetjes = el('section', 'kader weetjes');
  const laatste = lees('moestuin.laatsteActie', null);
  if (laatste?.tekst) weetjes.append(el('p', '', `Laatst in de tuin: ${laatste.tekst}`));
  else weetjes.hidden = true;

  // Online top 5 van het spel; verschijnt alleen als die er is
  const online = el('section', 'kader weetjes online-top');
  online.hidden = true;
  const ol = el('ol');
  online.append(el('h2', '', 'Top 5 Tuinieren'), ol);
  haalTop().then((top) => {
    if (!top?.length) return;
    vulLijst(ol, top.slice(0, 5));
    online.hidden = false;
  });

  root.append(kop, begroeting, keuzes, weetjes, online);
}

render(document.getElementById('app'));
