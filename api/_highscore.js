// Logica voor de online highscore. Bestanden die met _ beginnen maakt Vercel niet tot een eigen endpoint.
// Opslag: één bestand highscore/scores.json in Vercel Blob (privé). Gelijktijdige inzendingen gaan goed
// doordat we alleen schrijven als het bestand sinds het lezen niet veranderd is (ETag), anders opnieuw.
import { createHash } from 'node:crypto';
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

export const TOP = 10;
export const NAAM_MAX = 12;
const BESTAND = 'highscore/scores.json';
const BEWAAR_MAX = 200; // zoveel scores houden we, de rest valt eraf
const MAX_PER_KWARTIER = 10; // inzendingen per IP-adres per 15 minuten
const KWARTIER = 15 * 60 * 1000;
const MAX_PUNTEN_PER_SECONDE = 100; // ruim boven wat je echt kunt halen
const MAX_SCORE = 500000;
const POGINGEN = 6;

export class Botsing extends Error {}

// ---------- Opslag ----------
// Een opslag heeft lees() -> { data, etag } | null en schrijf(data, etag) (gooit Botsing als iemand anders eerder was).

export function blobOpslag(env = process.env) {
  if (!env.BLOB_READ_WRITE_TOKEN && !env.BLOB_STORE_ID) return null;
  return {
    async lees() {
      const res = await get(BESTAND, { access: 'private', useCache: false });
      if (!res || res.statusCode !== 200) return null;
      const data = await new Response(res.stream).json();
      return { data, etag: res.blob.etag };
    },
    async schrijf(data, etag) {
      try {
        await put(BESTAND, JSON.stringify(data), {
          access: 'private',
          contentType: 'application/json',
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
          ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
        });
      } catch (e) {
        // ETag klopt niet meer, of het bestand is net door een ander aangemaakt
        if (e instanceof BlobPreconditionFailedError || /already exists|precondition/i.test(e?.message ?? '')) throw new Botsing();
        throw e;
      }
    },
  };
}

// Opslag in het geheugen, voor lokaal (npm run dev) en de tests.
export function geheugenOpslag() {
  let bestand = null;
  let versie = 0;
  return {
    async lees() {
      return bestand && { data: JSON.parse(bestand), etag: String(versie) };
    },
    async schrijf(data, etag) {
      if ((etag ?? null) !== (bestand ? String(versie) : null)) throw new Botsing();
      bestand = JSON.stringify(data);
      versie++;
    },
  };
}

// ---------- Controles ----------

// Naam opschonen: spaties samenvoegen, rare tekens eruit, maximaal NAAM_MAX tekens.
export function schoneNaam(invoer) {
  if (typeof invoer !== 'string') return '';
  return invoer
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _.!?'&+-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAAM_MAX)
    .trim();
}

// Controleert een inzending. Geeft { naam, score } terug of { fout }.
export function controleer(body) {
  const naam = schoneNaam(body?.naam);
  const score = body?.score;
  const tijd = body?.tijd;
  if (!naam) return { fout: 'Vul een naam in' };
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) return { fout: 'Ongeldige score' };
  if (typeof tijd !== 'number' || !Number.isFinite(tijd) || tijd < 1 || tijd > 4 * 3600) return { fout: 'Ongeldige speeltijd' };
  if (score > 500 + tijd * MAX_PUNTEN_PER_SECONDE) return { fout: 'Die score is te mooi om waar te zijn' };
  return { naam, score };
}

// IP-adressen bewaren we niet zelf, alleen een stukje van een hash, voor de limiet.
const ipCode = (ip) => createHash('sha256').update(`moestuinrush:${ip}`).digest('hex').slice(0, 16);

const top = (data) => (data?.scores ?? []).slice(0, TOP).map(({ n, s, d }) => ({ naam: n, score: s, datum: d }));

// ---------- Acties ----------

export async function haalTop(opslag) {
  const huidig = await opslag.lees();
  return top(huidig?.data);
}

// Slaat een score op. Geeft { top, plek } terug (plek is 1..TOP of null), of { fout, status }.
export async function slaOp(opslag, body, ip = 'onbekend', nu = Date.now()) {
  const ok = controleer(body);
  if (ok.fout) return { fout: ok.fout, status: 400 };
  const code = ipCode(ip);

  for (let poging = 0; poging < POGINGEN; poging++) {
    const huidig = await opslag.lees();
    const data = structuredClone(huidig?.data ?? { scores: [], limiet: {} });
    data.scores ??= [];
    data.limiet ??= {};

    // Limiet per IP: oude tijdstippen weggooien, dan tellen
    for (const [k, tijden] of Object.entries(data.limiet)) {
      const vers = tijden.filter((t) => nu - t < KWARTIER);
      if (vers.length) data.limiet[k] = vers;
      else delete data.limiet[k];
    }
    const mijn = data.limiet[code] ?? [];
    if (mijn.length >= MAX_PER_KWARTIER) return { fout: 'Even rustig aan, probeer het straks nog eens', status: 429 };
    data.limiet[code] = [...mijn, nu];

    const id = Math.random().toString(36).slice(2, 8);
    data.scores.push({ n: ok.naam, s: ok.score, d: new Date(nu).toISOString().slice(0, 10), id });
    data.scores.sort((a, b) => b.s - a.s);
    data.scores = data.scores.slice(0, BEWAAR_MAX);

    try {
      await opslag.schrijf(data, huidig?.etag ?? null);
    } catch (e) {
      if (!(e instanceof Botsing)) throw e;
      // Iemand anders schreef net tegelijk: even wachten en opnieuw met de nieuwste versie
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 150 * (poging + 1)));
      continue;
    }
    const plek = data.scores.findIndex((s) => s.id === id);
    return { top: top(data), plek: plek >= 0 && plek < TOP ? plek + 1 : null };
  }
  return { fout: 'Het is even heel druk, probeer het nog eens', status: 503 };
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// Eén handler voor GET (top 10 ophalen) en POST (score insturen).
export async function behandel(request, opslag) {
  if (!opslag) return json({ fout: 'De online highscore is nog niet ingesteld' }, 503);
  try {
    if (request.method === 'GET') return json({ top: await haalTop(opslag) });
    if (request.method === 'POST') {
      const tekst = await request.text();
      if (tekst.length > 500) return json({ fout: 'Te groot' }, 413);
      let body;
      try {
        body = JSON.parse(tekst);
      } catch {
        return json({ fout: 'Ongeldige invoer' }, 400);
      }
      const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'onbekend';
      const uit = await slaOp(opslag, body, ip);
      return uit.fout ? json({ fout: uit.fout }, uit.status) : json(uit);
    }
    return json({ fout: 'Methode niet toegestaan' }, 405);
  } catch (e) {
    console.error(e);
    return json({ fout: 'Er ging iets mis met de highscore' }, 500);
  }
}
