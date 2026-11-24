// Het weer in de tuin: zon, regen of storm.
// Dit bestand tekent het weer (lucht, zon, wolken, regen, wind en bliksem) en houdt de druppels bij.
// Wanneer het weer wisselt en wat het met de planten doet, staat bovenin spel.js (WEER).
import { KLEUR } from './spel-sprites.js';

// Hoe elk weer eruitziet. donker = hoe donker het veld wordt, regen = druppels per seconde,
// wind = hoe hard alles naar links waait, wolken = hoeveel wolken er in de lucht hangen.
export const WEER_SOORTEN = {
  zon: { naam: 'Zonnig', sprite: 'weerZon', donker: 0, regen: 0, wind: 0, wolken: 0 },
  regen: { naam: 'Regen', sprite: 'weerRegen', donker: 0.14, regen: 40, wind: -6, wolken: 0.85 },
  storm: { naam: 'Storm', sprite: 'weerStorm', donker: 0.3, regen: 110, wind: -38, wolken: 1 },
};

const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * Alles staat in één ruimte: de lucht boven de schutting (lucht pixels hoog) en daaronder het veld.
 * y < 0 is de lucht, y >= 0 het veld; zo vallen de druppels uit de lucht door tot in de tuin.
 */
export function maakWeer(soort, W, lucht) {
  const wolken = Array.from({ length: 4 }, (_, i) => ({ x: (i * (W + 24)) / 4 - 8, y: Math.round(rnd(0, 4)), breed: Math.round(rnd(12, 18)) }));
  return { nu: soort, vorige: soort, mix: 1, W, lucht, druppels: [], spatjes: [], strepen: [], wolken, teller: 0, flits: 0, bliksem: null, inslag: null };
}

export function wisselWeer(w, soort) {
  Object.assign(w, { vorige: w.nu, nu: soort, mix: 0 });
}

// een eigenschap van het weer, langzaam overgaand van het vorige naar het nieuwe weer
const meng = (w, eig) => WEER_SOORTEN[w.vorige][eig] + (WEER_SOORTEN[w.nu][eig] - WEER_SOORTEN[w.vorige][eig]) * w.mix;

/** 0 bij windstil, 1 bij volle storm: daarmee wuiven de plantjes. */
export const windKracht = (w) => Math.min(1, Math.abs(meng(w, 'wind')) / 30);

export function werkWeerBij(w, dt, H, overgang) {
  const { W, lucht } = w;
  w.mix = Math.min(1, w.mix + dt / overgang);
  w.flits = Math.max(0, w.flits - dt);
  if (w.inslag && (w.inslag.t += dt) > 0.35) w.inslag = null;
  const wind = meng(w, 'wind');

  // regendruppels: vallen vanuit de lucht en spatten ergens in het veld uiteen
  w.teller += meng(w, 'regen') * dt;
  while (w.teller >= 1) {
    w.teller--;
    w.druppels.push({ x: rnd(0, W - wind), y: -lucht - rnd(0, 6), vy: rnd(85, 105), eind: rnd(-4, H) });
  }
  for (const d of w.druppels) {
    d.y += d.vy * dt;
    d.x += wind * dt;
    if (d.y >= d.eind) {
      d.weg = true;
      if (d.eind >= 0) w.spatjes.push({ x: Math.round(d.x), y: Math.round(d.eind), t: 0.12 });
    }
  }
  w.druppels = w.druppels.filter((d) => !d.weg);
  for (const s of w.spatjes) s.t -= dt;
  w.spatjes = w.spatjes.filter((s) => s.t > 0);

  // windvlagen: witte streepjes die snel over alles heen schieten
  if (Math.random() < (Math.abs(wind) / 38) * dt * 7) {
    w.strepen.push({ x: W + 2, y: Math.round(rnd(-lucht + 2, H - 2)), lengte: Math.round(rnd(4, 9)), v: rnd(80, 120) });
  }
  for (const s of w.strepen) s.x -= s.v * dt;
  w.strepen = w.strepen.filter((s) => s.x + s.lengte > -2);

  // wolken drijven langzaam (en bij storm snel) naar links
  for (const c of w.wolken) {
    c.x -= (2 + Math.abs(wind) * 0.35) * dt;
    if (c.x + c.breed < -2) Object.assign(c, { x: W + rnd(0, 8), y: Math.round(rnd(0, 4)), breed: Math.round(rnd(12, 18)) });
  }
}

/** De bliksem slaat in op (x, y) in het veld: een flits en een zigzag uit de lucht. */
export function slaInBij(w, x, y) {
  const punten = [];
  let px = x + rnd(-6, 6);
  for (let py = -w.lucht; py < y; py += 3) {
    punten.push([Math.round(px), py]);
    px += rnd(-2.2, 2.2);
    px += (x - px) * 0.25; // toch naar het doel toe
  }
  punten.push([Math.round(x), Math.round(y)]);
  w.inslag = { punten, t: 0 };
  w.flits = 0.25;
}

// Tekent alles in de ruimte van het weer naar een canvas waarvan de bovenkant op y = boven ligt.
function tekenDeeltjes(ctx, w, boven, onder) {
  const storm = meng(w, 'wind') < -20;
  for (const d of w.druppels) {
    const y = Math.round(d.y) - boven;
    const x = Math.round(d.x);
    if (d.y < boven - 3 || d.y > onder + 1) continue;
    ctx.fillStyle = d.y < 0 ? KLEUR.u : KLEUR.l;
    if (storm) {
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 1, y - 1, 1, 1);
      ctx.fillRect(x + 2, y - 2, 1, 1);
    } else ctx.fillRect(x, y - 1, 1, 2);
  }
  ctx.fillStyle = KLEUR.l;
  for (const s of w.spatjes) {
    if (s.y < boven || s.y > onder) continue;
    ctx.fillRect(s.x - 1, s.y - boven, 1, 1);
    ctx.fillRect(s.x + 1, s.y - boven, 1, 1);
  }
  ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
  for (const s of w.strepen) {
    if (s.y < boven || s.y > onder) continue;
    ctx.fillRect(Math.round(s.x), s.y - boven, s.lengte, 1);
  }
  if (w.inslag) {
    const zicht = Math.floor(w.inslag.t * 30) % 3 !== 2; // de bliksem flikkert even
    if (zicht) {
      for (let i = 1; i < w.inslag.punten.length; i++) {
        const [x0, y0] = w.inslag.punten[i - 1];
        const [x1, y1] = w.inslag.punten[i];
        for (let s = 0; s <= 3; s++) {
          const x = Math.round(x0 + ((x1 - x0) * s) / 3);
          const y = Math.round(y0 + ((y1 - y0) * s) / 3);
          if (y < boven || y > onder) continue;
          ctx.fillStyle = KLEUR.y;
          ctx.fillRect(x - 1, y - boven, 1, 1);
          ctx.fillStyle = KLEUR.w;
          ctx.fillRect(x, y - boven, 1, 1);
        }
      }
    }
  }
  if (w.flits > 0) {
    ctx.fillStyle = `rgb(255 255 255 / ${Math.min(0.7, w.flits * 3)})`;
    ctx.fillRect(-2, -2, w.W + 4, onder - boven + 4);
  }
}

/** Het weer over het speelveld: donkerder bij regen en storm, druppels, wind, en het vakje waar de bliksem gaat inslaan. */
export function tekenWeerVeld(ctx, w, H, tijd, vak) {
  const donker = meng(w, 'donker');
  if (donker > 0) {
    ctx.fillStyle = `rgb(20 28 70 / ${donker})`;
    ctx.fillRect(-2, -2, w.W + 4, H + 4);
  }
  if (w.bliksem) {
    // waarschuwing: het vakje knippert geel, steeds sneller
    const b = w.bliksem;
    const tempo = 4 + b.t * 8;
    if (Math.floor(b.t * tempo) % 2 === 0) {
      ctx.fillStyle = KLEUR.y;
      const x = b.x - vak / 2 - 1;
      const y = b.y - vak / 2 - 1;
      ctx.fillRect(x, y, vak + 2, 1);
      ctx.fillRect(x, y + vak + 1, vak + 2, 1);
      ctx.fillRect(x, y, 1, vak + 2);
      ctx.fillRect(x + vak + 1, y, 1, vak + 2);
    }
  }
  tekenDeeltjes(ctx, w, 0, H);
}

/** De lucht boven de schutting: zon, wolken en regen. `schutting` is de y van de bovenkant van de schutting. */
export function tekenLucht(ctx, w, schutting, tijd) {
  const { W, lucht } = w;
  const wolken = meng(w, 'wolken');
  const donker = meng(w, 'donker');
  if (donker > 0) {
    ctx.fillStyle = `rgb(40 50 90 / ${donker * 1.8})`;
    ctx.fillRect(0, 0, W, schutting);
  }
  // de zon rechtsboven, met stralen die om en om draaien
  const zon = 1 - wolken;
  if (zon > 0.05) {
    ctx.globalAlpha = zon;
    const zx = W - 9;
    const zy = 2;
    ctx.fillStyle = KLEUR.o;
    ctx.fillRect(zx + 1, zy, 3, 5);
    ctx.fillRect(zx, zy + 1, 5, 3);
    ctx.fillStyle = KLEUR.y;
    ctx.fillRect(zx + 1, zy + 1, 3, 3);
    ctx.fillStyle = KLEUR.y;
    const recht = Math.floor(tijd * 2) % 2 === 0;
    const stralen = recht ? [[2, -2], [2, 6], [-2, 2], [6, 2]] : [[-1, -1], [5, -1], [-1, 5], [5, 5]];
    for (const [x, y] of stralen) ctx.fillRect(zx + x, zy + y, 1, 1);
    ctx.globalAlpha = 1;
  }
  // wolken: lichtgrijs bij regen, donker blauwgrijs bij storm
  if (wolken > 0.02) {
    ctx.globalAlpha = Math.min(1, wolken);
    const storm = donker > 0.22;
    for (const c of w.wolken) {
      const x = Math.round(c.x);
      ctx.fillStyle = storm ? KLEUR.n : KLEUR.s;
      ctx.fillRect(x + 3, c.y, c.breed - 7, 2);
      ctx.fillRect(x, c.y + 2, c.breed, 3);
      ctx.fillStyle = storm ? '#3e4a66' : '#97a3b8';
      ctx.fillRect(x + 1, c.y + 5, c.breed - 2, 1);
      ctx.fillStyle = storm ? '#8090ad' : KLEUR.w;
      ctx.fillRect(x + 4, c.y, Math.max(1, c.breed - 10), 1);
    }
    ctx.globalAlpha = 1;
  }
  tekenDeeltjes(ctx, w, -lucht, 0);
}
