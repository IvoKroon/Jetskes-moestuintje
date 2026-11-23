// Het menu onderaan, voor alle pagina's op één plek.
// Elke pagina heeft <nav class="menu" data-actief="..." data-root="./ of ../"></nav>
// en laadt dit bestand. De bakkerij hoort bij de markt, dus daar licht Markt op.

const ITEMS = [
  { id: 'thuis', tekst: 'Thuis', pad: '' },
  { id: 'spel', tekst: 'Tuinieren', pad: 'spel/' },
  { id: 'markt', tekst: 'Markt', pad: 'markt/' },
  { id: 'planner', tekst: 'Moestuin', pad: 'planner/' },
];

const nav = document.querySelector('nav.menu');
if (nav) {
  const root = nav.dataset.root || './';
  const actief = nav.dataset.actief === 'bakkerij' ? 'markt' : nav.dataset.actief;
  nav.replaceChildren(...ITEMS.map((item) => {
    const a = document.createElement('a');
    a.href = root + item.pad;
    a.textContent = item.tekst;
    if (item.id === actief) {
      a.className = 'actief';
      a.setAttribute('aria-current', 'page');
    }
    return a;
  }));
}
