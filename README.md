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

De site staat op Vercel. Vercel herkent Vite: build-commando `npm run build`, output-map `dist`.

## Online highscore

Het spel heeft een gedeelde top 10. Na een potje vul je je naam in en gaat de score naar `/api/highscores`,
een Vercel-functie (`api/highscores.js`, logica in `api/_highscore.js`). De scores staan in Upstash Redis
(gratis, via de Vercel Marketplace). De functie leest `KV_REST_API_URL` en `KV_REST_API_TOKEN`
(of `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN`), die Vercel zelf invult als je de database koppelt.

Bescherming: naam maximaal 12 tekens zonder rare tekens, score moet passen bij de speeltijd,
maximaal 10 inzendingen per kwartier per IP-adres, en alleen de beste 200 scores blijven bewaard.

Lokaal (`npm run dev`) werkt `/api/highscores` ook, met een tijdelijke database in het geheugen.
Een score wissen: in het Upstash-dashboard de sleutel `moestuinrush:scores` openen en de regel verwijderen.
