// De tuinen (locaties) waarmee de planner begint, bijvoorbeeld voortuin en achtertuin. Vervang dit door de echte tuin van Jetske:
// meet de tuin op, zet de maten in centimeters en pas de onderdelen aan.
// t = soort onderdeel (zie ONDERDELEN in planner.js), plant-vakken hebben t: 'plant' en p: id van de plant.
// schatting: true toont bij de eerste keer een melding dat het een schatting is.
// x, y = linkerbovenhoek, w, h = breedte en lengte, allemaal in cm.

export const STARTTUINEN = [{
  naam: 'Voorbeeldtuin',
  breedte: 800,
  lengte: 1000,
  items: [
    { t: 'pad', x: 370, y: 0, w: 60, h: 1000 },
    { t: 'pad', x: 0, y: 470, w: 370, h: 60 },
    { t: 'bak', x: 60, y: 60, w: 120, h: 240 },
    { t: 'bak', x: 220, y: 60, w: 120, h: 240 },
    { t: 'bed', x: 40, y: 580, w: 300, h: 120 },
    { t: 'bed', x: 40, y: 740, w: 300, h: 120 },
    { t: 'kas', x: 490, y: 60, w: 250, h: 300 },
    { t: 'schuur', x: 520, y: 760, w: 220, h: 200 },
    { t: 'compost', x: 470, y: 620, w: 100, h: 100 },
    { t: 'regenton', x: 750, y: 380, w: 60, h: 60 },
    { t: 'gazon', x: 0, y: 900, w: 360, h: 100 },
    { t: 'bank', x: 110, y: 920, w: 150, h: 50 },
    { t: 'boom', x: 560, y: 400, w: 240, h: 240 },
    { t: 'plant', p: 'tomaat', x: 516, y: 85, w: 50, h: 250 },
    { t: 'plant', p: 'basilicum', x: 566, y: 85, w: 40, h: 240 },
    { t: 'plant', p: 'paprika', x: 626, y: 85, w: 90, h: 135 },
    { t: 'plant', p: 'sla', x: 70, y: 70, w: 100, h: 100 },
    { t: 'plant', p: 'radijs', x: 70, y: 180, w: 100, h: 50 },
    { t: 'plant', p: 'wortel', x: 70, y: 240, w: 100, h: 50 },
    { t: 'plant', p: 'aardbei', x: 235, y: 75, w: 90, h: 210 },
    { t: 'plant', p: 'aardappel', x: 50, y: 590, w: 280, h: 105 },
    { t: 'plant', p: 'boon', x: 50, y: 750, w: 150, h: 105 },
    { t: 'plant', p: 'ui', x: 250, y: 750, w: 80, h: 100 },
  ],
}];
