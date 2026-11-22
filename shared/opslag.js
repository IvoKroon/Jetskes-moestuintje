// Kleine laag om localStorage veilig te gebruiken.
// Alle sleutels beginnen met 'jetske.' gevolgd door het onderdeel:
//   jetske.spel.*      voor het spel Tuinieren
//   jetske.moestuin.*  voor de moestuinplanner

const PREFIX = 'jetske.';

export function lees(sleutel, standaard = null) {
  try {
    const waarde = localStorage.getItem(PREFIX + sleutel);
    return waarde === null ? standaard : JSON.parse(waarde);
  } catch {
    return standaard;
  }
}

export function bewaar(sleutel, waarde) {
  try {
    localStorage.setItem(PREFIX + sleutel, JSON.stringify(waarde));
  } catch {
    // Opslag vol of geblokkeerd: dan werkt alles gewoon zonder bewaren.
  }
}
