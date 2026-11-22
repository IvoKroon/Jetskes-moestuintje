import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { behandel, blobOpslag, geheugenOpslag } from './api/_highscore.js';

// Multi-page site: homepage in de root, het spel in spel/, de moestuinplanner in planner/.
// Een pagina wordt alleen meegebouwd als zijn index.html bestaat.
const paginas = { home: 'index.html', spel: 'spel/index.html', planner: 'planner/index.html' };
const input = Object.fromEntries(
  Object.entries(paginas)
    .filter(([, pad]) => existsSync(resolve(import.meta.dirname, pad)))
    .map(([naam, pad]) => [naam, resolve(import.meta.dirname, pad)]),
);

// Lokaal (npm run dev) draait /api/highscores ook, met een nep-database in het geheugen.
// Staat BLOB_READ_WRITE_TOKEN in je omgeving, dan gebruikt hij de echte Vercel Blob.
function highscoreApi() {
  return {
    name: 'highscore-api',
    configureServer(server) {
      const opslag = blobOpslag() ?? geheugenOpslag();
      server.middlewares.use('/api/highscores', async (req, res) => {
        const body = req.method === 'POST' ? await new Promise((ok) => {
          let d = '';
          req.on('data', (c) => (d += c));
          req.on('end', () => ok(d));
        }) : undefined;
        const antwoord = await behandel(new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body }), opslag);
        res.statusCode = antwoord.status;
        antwoord.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(await antwoord.text());
      });
    },
  };
}

export default defineConfig({
  plugins: [highscoreApi()],
  // Relatieve paden, zodat de site werkt op GitHub Pages onder /Jetskes-moestuintje/
  base: './',
  build: { rollupOptions: { input } },
});
