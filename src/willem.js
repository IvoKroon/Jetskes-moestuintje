// Willem, de engelenkat: als Jetske hem op de markt gekocht heeft, vliegt hij af en toe
// met fladderende vleugeltjes van onder naar boven over het hoofdscherm.
// Testen zonder hem te kopen: open de homepage met ?willem=1 (dan vliegt hij meteen en vaak).
import { eigenKatten } from '../spel/spel-markt.js';
import { katPlaatje, KLEUR } from '../spel/spel-sprites.js';

const SCHAAL = 5; // pixels per spritepixel
const VLUCHT_DUUR = 5; // seconden van onder naar boven
const WACHT_MIN = 20; // seconden tussen twee vluchten
const WACHT_MAX = 50;

// Vleugeltje op zijn rug, twee standen om mee te fladderen.
const VLEUGEL = {
  op: { x: 1, y: -4, raster: ['k.......', 'kk......', 'kwk.....', 'kwwk....', 'kwwwkk..', '.kwwwwk.', '..kkkkk.'] },
  neer: { x: -2, y: 3, raster: ['..kkkkk', 'kkwwwwk', 'kwwwwk.', 'kwwk...', 'kk.....'] },
};

const B = 14; // breedte plaatje: kat (12) plus ruimte voor de vleugel
const H = 12; // hoogte: halo + kat (10) plus ruimte voor de opgeslagen vleugel

/** Willem zittend met zijn vleugeltje in stand 'op' of 'neer', als canvas van 14x12. */
function vliegPlaatje(stand) {
  const c = document.createElement('canvas');
  c.width = B;
  c.height = H;
  const ctx = c.getContext('2d');
  const katX = 2;
  const katY = 2;
  ctx.drawImage(katPlaatje('zwartwit', 'zit'), katX, katY);
  const v = VLEUGEL[stand];
  v.raster.forEach((rij, dy) =>
    [...rij].forEach((t, dx) => {
      if (t === '.') return;
      ctx.fillStyle = KLEUR[t];
      ctx.fillRect(katX + v.x + dx, katY + 2 + v.y + dy, 1, 1);
    }),
  );
  return c;
}

let gestart = false;

export function startWillem() {
  if (gestart) return;
  const params = new URLSearchParams(location.search);
  const test = params.get('willem') === '1';
  if (!test && !eigenKatten().includes('zwartwit')) return;
  gestart = true;

  const standen = { op: vliegPlaatje('op'), neer: vliegPlaatje('neer') };
  const doek = document.createElement('canvas');
  doek.className = 'willem-vlieg';
  doek.width = B;
  doek.height = H;
  doek.setAttribute('aria-hidden', 'true');
  doek.style.width = `${B * SCHAAL}px`;
  doek.style.height = `${H * SCHAAL}px`;
  doek.hidden = true;
  document.body.append(doek);
  const ctx = doek.getContext('2d');

  // Glinsterende sterretjes die hij achterlaat
  const spoor = [];

  const wacht = () => (test ? 6 + Math.random() * 4 : WACHT_MIN + Math.random() * (WACHT_MAX - WACHT_MIN));

  function vlieg() {
    const start = performance.now();
    const breedte = innerWidth;
    const hoogte = innerHeight;
    const marge = B * SCHAAL;
    const x0 = marge / 2 + Math.random() * Math.max(0, breedte - 2 * marge);
    const zwaai = 18 + Math.random() * 16;
    const fase = Math.random() * Math.PI * 2;
    doek.hidden = false;

    function stap(nu) {
      const t = (nu - start) / 1000;
      const p = t / VLUCHT_DUUR;
      if (p >= 1) {
        doek.hidden = true;
        spoor.forEach((s) => s.el.remove());
        spoor.length = 0;
        setTimeout(vlieg, wacht() * 1000);
        return;
      }
      // van net onder het scherm tot net erboven, met een zachte golf heen en weer
      const y = hoogte + marge - p * (hoogte + 2 * marge + H * SCHAAL);
      const x = x0 + Math.sin(fase + t * 2.2) * zwaai;
      // op hele pixels blijven, dan blijft de pixelart scherp
      const px = Math.round(x / SCHAAL) * SCHAAL - (B * SCHAAL) / 2;
      const py = Math.round(y / SCHAAL) * SCHAAL;
      doek.style.transform = `translate(${px}px, ${py}px)`;

      const stand = Math.floor(t * 7) % 2 ? 'neer' : 'op';
      ctx.clearRect(0, 0, B, H);
      ctx.drawImage(standen[stand], 0, 0);

      // af en toe een sterretje onder hem
      if (Math.random() < 0.12) {
        const s = document.createElement('span');
        s.className = 'willem-ster';
        s.setAttribute('aria-hidden', 'true');
        s.style.transform = `translate(${px + 8 + Math.round(Math.random() * 10) * SCHAAL}px, ${py + H * SCHAAL}px)`;
        document.body.append(s);
        spoor.push({ el: s, tot: nu + 700 });
      }
      for (let i = spoor.length - 1; i >= 0; i--) {
        if (spoor[i].tot < nu) {
          spoor[i].el.remove();
          spoor.splice(i, 1);
        }
      }
      requestAnimationFrame(stap);
    }
    requestAnimationFrame(stap);
  }

  setTimeout(vlieg, (test ? 1 : 4 + Math.random() * 8) * 1000);
}
