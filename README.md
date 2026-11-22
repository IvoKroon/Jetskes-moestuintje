# Jetskes moestuintje

Een website voor Jetske met een tuinierspel en een moestuinplanner, in pixelart-stijl en gemaakt voor de telefoon.

## Mappen

| Map | Wat |
| --- | --- |
| `index.html`, `src/` | Homepage met begroeting en menu |
| `spel/` | Het tuinierspel |
| `planner/` | De moestuinplanner |
| `shared/` | Gedeelde stijl (`style.css`), pixelart (`sprites.js`) en opslag (`opslag.js`) |

Elke pagina is een losse `index.html` met gewone ES modules. Vite bouwt ze samen tot één site.
Opslag gebruikt localStorage met sleutels `jetske.spel.*` en `jetske.moestuin.*`.

## Persoonlijke tekst aanpassen

De begroeting op de homepage staat in `src/config.js`.

## Lokaal draaien

```sh
npm install
npm run dev
```

## Online zetten

Elke push naar `main` zet de site via GitHub Actions op GitHub Pages.
Eenmalig nodig: in de repository onder Settings, Pages, bij Source "GitHub Actions" kiezen.
