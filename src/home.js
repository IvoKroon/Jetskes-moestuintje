import { sprite } from '../shared/sprites.js';
import { lees } from '../shared/opslag.js';
import { BEGROETING } from './config.js';

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
  const spelTekst = el('span', '', 'Tuinierspel');
  spelTekst.append(el('small', '', 'Oogst snel, jaag de beestjes weg'));
  spel.append(sprite('tomaat', { grootte: 40 }), spelTekst);

  const tuin = el('a', 'knop breed');
  tuin.href = './planner/';
  const tuinTekst = el('span', '', 'Plan je moestuintje');
  tuinTekst.append(el('small', '', 'Teken je tuin en houd bij wat je doet'));
  tuin.append(sprite('kiemplant', { grootte: 40 }), tuinTekst);
  keuzes.append(spel, tuin);

  const weetjes = el('section', 'kader weetjes');
  const highscore = lees('spel.highscore', 0);
  weetjes.append(
    el('p', '', highscore > 0 ? `Jouw highscore: ${highscore}` : 'Nog geen highscore. Durf jij?'),
  );
  const laatste = lees('moestuin.laatsteActie', null);
  if (laatste?.tekst) weetjes.append(el('p', '', `Laatst in de tuin: ${laatste.tekst}`));

  root.append(kop, begroeting, keuzes, weetjes);
}

render(document.getElementById('app'));
