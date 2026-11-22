import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Multi-page site: homepage in de root, het spel in spel/, de moestuinplanner in planner/.
// Een pagina wordt alleen meegebouwd als zijn index.html bestaat.
const paginas = { home: 'index.html', spel: 'spel/index.html', planner: 'planner/index.html' };
const input = Object.fromEntries(
  Object.entries(paginas)
    .filter(([, pad]) => existsSync(resolve(import.meta.dirname, pad)))
    .map(([naam, pad]) => [naam, resolve(import.meta.dirname, pad)]),
);

export default defineConfig({
  // Relatieve paden, zodat de site werkt op GitHub Pages onder /Jetskes-moestuintje/
  base: './',
  build: { rollupOptions: { input } },
});
