// Online highscore: praat met /api/highscores (een Vercel-functie, zie api/).
// Gaat het mis (geen internet, nog niet ingesteld), dan geven de functies null of een fout terug
// en werkt het spel gewoon door met alleen de lokale scores.
import { lees, bewaar } from './opslag.js';

const ADRES = '/api/highscores';
export const NAAM_MAX = 12;

async function vraag(opties) {
  const ctrl = new AbortController();
  const klok = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(ADRES, { ...opties, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { fout: data.fout || 'Online highscore niet bereikbaar' };
    return data;
  } catch {
    return { fout: 'Geen verbinding met de online highscore' };
  } finally {
    clearTimeout(klok);
  }
}

// Top 10 ophalen. Geeft een lijst terug, of null als het niet lukt.
export async function haalTop() {
  const data = await vraag({ method: 'GET' });
  return Array.isArray(data.top) ? data.top : null;
}

// Score insturen. Geeft { top, plek } of { fout } terug.
export function stuurScore(naam, score, tijd) {
  return vraag({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ naam, score, tijd: Math.round(tijd) }),
  });
}

export const laatsteNaam = () => lees('spel.naam', '');
export const bewaarNaam = (naam) => bewaar('spel.naam', naam);

// Vult een <ol> met de top. markeer = plek (1..10) die oplicht.
export function vulLijst(ol, top, markeer = null) {
  ol.replaceChildren();
  top.forEach((s, i) => {
    const li = document.createElement('li');
    if (i + 1 === markeer) li.className = 'jij';
    const naam = document.createElement('span');
    naam.textContent = s.naam;
    const score = document.createElement('span');
    score.textContent = Number(s.score);
    li.append(naam, score);
    ol.append(li);
  });
}
