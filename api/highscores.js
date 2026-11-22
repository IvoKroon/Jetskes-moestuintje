// Vercel-functie: /api/highscores
//   GET  -> { top: [{ naam, score, datum }] }
//   POST { naam, score, tijd } -> { top, plek }
import { behandel, blobOpslag } from './_highscore.js';

export function GET(request) {
  return behandel(request, blobOpslag());
}

export function POST(request) {
  return behandel(request, blobOpslag());
}
