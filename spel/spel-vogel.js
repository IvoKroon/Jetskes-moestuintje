// Af en toe vliegt er een vogeltje door de lucht boven de schutting. Puur voor de sfeer:
// je kunt hem niet tikken en hij doet niks met de score.

// ---------- Instellingen ----------
// Om te testen: spel/?vogel=1 laat na 1 seconde een vogel vliegen, en daarna steeds na een paar seconden.
const TEST_VOGEL = new URLSearchParams(location.search).get('vogel') === '1';
export const VOGEL = {
  eerste: TEST_VOGEL ? [1, 1] : [8, 15], // seconden spelen tot de eerste vogel (tussen ... en ...)
  tussen: TEST_VOGEL ? [3, 5] : [15, 30], // daarna weer na zoveel seconden
  snelheid: [10, 15], // pixels per seconde; het veld is 60 breed, dus ongeveer 5 seconden in beeld
  groepje: 0.25, // kans dat er twee of drie samen vliegen
  hoogte: [1, 4], // bovenkant van de vogel in de lucht (de schutting begint op 14)
};

// Drie standen van de vleugels, als silhouet tegen de lucht
const STANDEN = [
  ['k.....k', '.k...k.', '..k.k..', '...k...'], // vleugels omhoog
  ['.......', '.kk.kk.', 'k..k..k', '.......'], // midden, zoals een meeuw
  ['.......', '...k...', '..kkk..', '.k...k.'], // vleugels omlaag
];
const KLAPPEN = [0, 1, 2, 1]; // volgorde van de standen bij één vleugelslag
const BREED = 7;

const rnd = (a, b) => a + Math.random() * (b - a);

export function maakLucht() {
  return { vogels: [], klok: rnd(...VOGEL.eerste) };
}

// dt: verstreken seconden; breed: breedte van de lucht; magVliegen: false bij bijvoorbeeld storm
export function werkVogelsBij(lucht, dt, breed, magVliegen = true) {
  for (const v of lucht.vogels) {
    v.t += dt;
    v.x += v.kant * v.snel * dt;
  }
  lucht.vogels = lucht.vogels.filter((v) => (v.kant > 0 ? v.x < breed + 2 : v.x > -BREED - 2));
  if (lucht.vogels.length) return;

  lucht.klok -= dt;
  if (lucht.klok > 0 || !magVliegen) return;
  lucht.klok = rnd(...VOGEL.tussen);
  const kant = Math.random() < 0.5 ? 1 : -1;
  const snel = rnd(...VOGEL.snelheid);
  const hoogte = rnd(...VOGEL.hoogte);
  const aantal = Math.random() < VOGEL.groepje ? (Math.random() < 0.5 ? 2 : 3) : 1;
  for (let i = 0; i < aantal; i++) {
    lucht.vogels.push({
      // de volgers vliegen er een stukje achter en iets lager, in een schuin rijtje
      x: (kant > 0 ? -BREED : breed) - kant * i * 9,
      y: hoogte + i * 2,
      kant,
      snel,
      t: rnd(0, 2), // zodat ze niet precies tegelijk klapperen
      fase: rnd(0, Math.PI * 2),
    });
  }
}

export function tekenVogels(ctx, lucht, kleuren) {
  for (const v of lucht.vogels) {
    // een paar keer klapperen, dan even zweven met de vleugels in het midden
    const cyclus = v.t % 2;
    const stand = cyclus < 1.2 ? KLAPPEN[Math.floor(cyclus * 10) % KLAPPEN.length] : 1;
    const y = Math.round(v.y + Math.sin(v.t * 3 + v.fase) * 0.8);
    const x = Math.round(v.x);
    ctx.fillStyle = kleuren.k;
    STANDEN[stand].forEach((rij, dy) => {
      for (let dx = 0; dx < rij.length; dx++) if (rij[dx] !== '.') ctx.fillRect(x + dx, y + dy, 1, 1);
    });
  }
}
