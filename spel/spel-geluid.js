// Kleine 8-bit geluidjes met de Web Audio API. Geen bestanden nodig.
import { lees, bewaar } from '../shared/opslag.js';

let ac = null;

function toon(freq, duur, { type = 'square', vol = 0.05, naar = null, wacht = 0 } = {}) {
  if (geluid.uit || !ac) return;
  const t = ac.currentTime + wacht;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (naar) osc.frequency.exponentialRampToValueAtTime(naar, t + duur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duur + 0.02);
}

const reeks = (noten, stap, opties) => noten.forEach((f, i) => toon(f, stap * 1.2, { ...opties, wacht: i * stap }));

export const geluid = {
  uit: lees('spel.geluidUit', false) === true,
  zet(uit) {
    this.uit = uit;
    bewaar('spel.geluidUit', uit);
    if (!uit) this.wakker();
  },
  // Browsers staan geluid pas toe na een tik; daarom maken we hem dan pas aan.
  wakker() {
    if (this.uit) return;
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch {
      ac = null;
    }
  },
  zaai: () => toon(220, 0.07, { naar: 330, vol: 0.04 }),
  oogst: (combo) => {
    const k = 2 ** ((Math.min(combo, 5) - 1) * 2 / 12);
    reeks([523 * k, 659 * k, 784 * k], 0.05);
  },
  tik: () => toon(300, 0.05, { type: 'triangle', vol: 0.08 }),
  weg: () => toon(180, 0.12, { type: 'sawtooth', naar: 60, vol: 0.05 }),
  water: () => reeks([880, 660, 990], 0.04, { type: 'triangle', vol: 0.06 }),
  opruimen: () => toon(140, 0.08, { type: 'triangle', naar: 90, vol: 0.08 }),
  nee: () => toon(110, 0.05, { type: 'triangle', vol: 0.06 }),
  au: () => toon(330, 0.35, { type: 'triangle', naar: 90, vol: 0.12 }),
  foei: () => reeks([300, 200], 0.1, { vol: 0.05 }),
  hartje: () => reeks([659, 880, 1175], 0.07),
  level: () => reeks([523, 659, 784, 1047], 0.08),
  einde: () => reeks([392, 330, 262, 196], 0.18, { type: 'triangle', vol: 0.1 }),
};
