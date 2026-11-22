// Logica voor de online highscore. Bestanden die met _ beginnen maakt Vercel niet tot een eigen endpoint.
// Opslag: Upstash Redis (via de Vercel Marketplace), aangesproken met de gewone REST API, dus zonder extra pakketten.

export const LIJST = 'moestuinrush:scores';
export const TOP = 10;
const BEWAAR_MAX = 200; // zoveel scores houden we, de rest valt eraf
export const NAAM_MAX = 12;
const MAX_PER_KWARTIER = 10; // inzendingen per IP-adres per 15 minuten
const MAX_PUNTEN_PER_SECONDE = 100; // ruim boven wat je echt kunt halen
const MAX_SCORE = 500000;

// Redis via REST. In productie Upstash, lokaal (npm run dev) een nep-versie in het geheugen.
export function upstash(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (opdrachten) => {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(opdrachten),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const uit = await res.json();
    for (const r of uit) if (r.error) throw new Error(r.error);
    return uit.map((r) => r.result);
  };
}

// Kleine nep-Redis voor lokaal testen. Kent alleen de opdrachten die we gebruiken.
export function geheugenRedis() {
  const zsets = new Map();
  const tellers = new Map();
  const sorteer = (z) => [...z.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const een = ([cmd, ...a]) => {
    switch (cmd) {
      case 'ZADD': {
        const z = zsets.get(a[0]) ?? new Map();
        zsets.set(a[0], z);
        z.set(a[2], Number(a[1]));
        return 1;
      }
      case 'ZRANGE': {
        // alleen: ZRANGE key start stop REV WITHSCORES
        const lijst = sorteer(zsets.get(a[0]) ?? new Map()).slice(Number(a[1]), Number(a[2]) + 1);
        return lijst.flatMap(([m, s]) => [m, String(s)]);
      }
      case 'ZREMRANGEBYRANK': {
        const z = zsets.get(a[0]);
        if (!z) return 0;
        // laagste eerst; we gebruiken alleen 0 .. -(n+1)
        const oplopend = sorteer(z).reverse();
        const weg = oplopend.slice(0, Math.max(0, oplopend.length + Number(a[2]) + 1));
        weg.forEach(([m]) => z.delete(m));
        return weg.length;
      }
      case 'INCR': {
        const n = (tellers.get(a[0]) ?? 0) + 1;
        tellers.set(a[0], n);
        return n;
      }
      case 'SET':
        if (!tellers.has(a[0])) tellers.set(a[0], Number(a[1]));
        return 'OK';
      default:
        throw new Error(`Onbekende opdracht ${cmd}`);
    }
  };
  return async (opdrachten) => opdrachten.map(een);
}

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

function leesTop(platte) {
  const top = [];
  for (let i = 0; i < platte.length; i += 2) {
    try {
      const { n, d } = JSON.parse(platte[i]);
      top.push({ naam: n, score: Number(platte[i + 1]), datum: d });
    } catch {
      // kapotte regel overslaan
    }
  }
  return top;
}

export async function haalTop(redis) {
  const [platte] = await redis([['ZRANGE', LIJST, '0', String(TOP - 1), 'REV', 'WITHSCORES']]);
  return leesTop(platte);
}

// Slaat een score op. Geeft { top, plek } terug (plek is 1..TOP of null), of { fout, status }.
export async function slaOp(redis, body, ip = 'onbekend') {
  const sleutel = `moestuinrush:limiet:${ip}`;
  // SET ... NX zet de teller (met verlooptijd) alleen als hij nog niet bestaat; INCR houdt die verlooptijd
  const [, aantal] = await redis([['SET', sleutel, '0', 'EX', '900', 'NX'], ['INCR', sleutel]]);
  if (aantal > MAX_PER_KWARTIER) return { fout: 'Even rustig aan, probeer het straks nog eens', status: 429 };

  const ok = controleer(body);
  if (ok.fout) return { fout: ok.fout, status: 400 };

  const id = Math.random().toString(36).slice(2, 8);
  const datum = new Date().toISOString().slice(0, 10);
  const lid = JSON.stringify({ n: ok.naam, d: datum, id });
  const [, , platte] = await redis([
    ['ZADD', LIJST, String(ok.score), lid],
    ['ZREMRANGEBYRANK', LIJST, '0', String(-(BEWAAR_MAX + 1))],
    ['ZRANGE', LIJST, '0', String(TOP - 1), 'REV', 'WITHSCORES'],
  ]);
  const plek = platte.findIndex((m, i) => i % 2 === 0 && m === lid);
  return { top: leesTop(platte), plek: plek === -1 ? null : plek / 2 + 1 };
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// Eén handler voor GET (top 10 ophalen) en POST (score insturen).
export async function behandel(request, redis) {
  if (!redis) return json({ fout: 'De online highscore is nog niet ingesteld' }, 503);
  try {
    if (request.method === 'GET') return json({ top: await haalTop(redis) });
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
      const uit = await slaOp(redis, body, ip);
      return uit.fout ? json({ fout: uit.fout }, uit.status) : json(uit);
    }
    return json({ fout: 'Methode niet toegestaan' }, 405);
  } catch (e) {
    console.error(e);
    return json({ fout: 'Er ging iets mis met de highscore' }, 500);
  }
}
