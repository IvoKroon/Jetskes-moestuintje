// Vercel-functie: /api/highscores
//   GET  -> { top: [{ naam, score, datum }] }
//   POST { naam, score, tijd } -> { top, plek }
import { behandel, upstash } from './_highscore.js';

export function GET(request) {
  return behandel(request, upstash());
}

export function POST(request) {
  return behandel(request, upstash());
}
