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

## Vlierbes frenzy testen

Na een minuut spelen begint de vlierbes frenzy (code in `spel/spel-frenzy.js`). Om hem meteen te testen:
open `spel/?frenzy=1`. Dan start hij 2 seconden na Start en daarna elke 20 seconden opnieuw.
Een testpotje gaat niet naar de online top 10.

## Online zetten

De site staat op Vercel. Vercel herkent Vite: build-commando `npm run build`, output-map `dist`.

## Online highscore

Het spel heeft een gedeelde top 10. Na een potje vul je je naam in en gaat de score naar `/api/highscores`,
een Vercel-functie (`api/highscores.js`, logica in `api/_highscore.js`). De scores staan in één bestand
`highscore/scores.json` in een privé Vercel Blob-store. De functie gebruikt `BLOB_READ_WRITE_TOKEN`,
die Vercel zelf invult als je de Blob-store aan het project koppelt.

Gelijktijdige inzendingen: er wordt alleen geschreven als het bestand sinds het lezen niet veranderd is
(ETag, `ifMatch`). Was iemand net eerder, dan leest de functie opnieuw en probeert het nog eens.

Bescherming: naam maximaal 12 tekens zonder rare tekens, score moet passen bij de speeltijd,
maximaal 10 inzendingen per kwartier per IP-adres (alleen een hash bewaard), en alleen de beste 200 scores blijven bewaard.

Lokaal (`npm run dev`) werkt `/api/highscores` ook, met een tijdelijke opslag in het geheugen.
Een score wissen: in Vercel bij Storage de Blob-store openen, `highscore/scores.json` downloaden,
de regel weghalen en het bestand weer uploaden onder dezelfde naam.
