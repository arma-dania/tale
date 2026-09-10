/**
 * Udtrækning af eksaminators replik, mens den bliver til.
 *
 * Eksaminator svarer med ét værktøjskald, hvor `replik` er det første felt.
 * Værktøjets argumenter streames som ufuldstændig JSON, så for at kunne læse
 * replikken op, længe før resten af bogføringen er skrevet, graver vi
 * strengen ud af den halve JSON, efterhånden som den kommer.
 */

const NOEGLE = '"replik"';

/**
 * Finder anførselstegnet, der åbner replik-strengen. Kræver at nøglen følges
 * af et kolon, så et tilfældigt "replik" inde i en anden værdi ikke narrer os.
 * @returns {number} indeks på det åbnende anførselstegn, eller -1
 */
function findStrengStart(json) {
  let fra = 0;
  for (;;) {
    const noegle = json.indexOf(NOEGLE, fra);
    if (noegle === -1) return -1;
    let i = noegle + NOEGLE.length;
    while (i < json.length && /\s/.test(json[i])) i++;
    if (json[i] === ":") {
      i++;
      while (i < json.length && /\s/.test(json[i])) i++;
      return json[i] === '"' ? i : -1;
    }
    fra = noegle + 1;
  }
}

/**
 * @param {string} samletJson alle hidtil modtagne stykker JSON, sat sammen
 * @returns {{tekst: string, afsluttet: boolean} | null} null hvis feltet
 *   endnu ikke er begyndt, eller strengen ikke kan afkodes endnu
 */
export function udtraekReplik(samletJson) {
  const start = findStrengStart(samletJson);
  if (start === -1) return null;

  let raa = "";
  let afsluttet = false;
  for (let i = start + 1; i < samletJson.length; i++) {
    const tegn = samletJson[i];
    if (tegn === "\\") {
      raa += tegn + (samletJson[i + 1] ?? "");
      i++;
      continue;
    }
    if (tegn === '"') {
      afsluttet = true;
      break;
    }
    raa += tegn;
  }

  // Strengen kan være hugget over midt i en escape-sekvens.
  raa = raa.replace(/\\u[0-9a-fA-F]{0,3}$/, "").replace(/\\$/, "");

  try {
    return { tekst: JSON.parse(`"${raa}"`), afsluttet };
  } catch {
    return null;
  }
}
