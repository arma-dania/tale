/**
 * Opdeling af eksaminators replik i sætninger, mens den bliver skrevet.
 *
 * Stemmen skal begynde at læse op på første sætning i stedet for at vente på
 * hele replikken — det er forskellen på et par hundrede millisekunders pause
 * og et par sekunders. Til gengæld må vi ikke klippe midt i "bl.a." eller i
 * et tal som 1.500, for så lyder oplæsningen forkert.
 */

const FORKORTELSER = [
  "bl.a", "f.eks", "fx", "osv", "dvs", "ca", "pct", "mv", "m.v",
  "jf", "nr", "kr", "mio", "mia", "evt", "inkl", "ekskl", "pga", "iflg",
];

const TEGN = new Set([".", "!", "?", ":", "\n"]);

/** Er punktummet på plads `i` en sætningsafslutning — eller del af noget andet? */
function erAfslutning(tekst, i) {
  const tegn = tekst[i];
  if (!TEGN.has(tegn)) return false;
  if (tegn !== ".") return true;

  // Tal: 1.500 eller 2.5
  if (/\d/.test(tekst[i - 1] || "") && /\d/.test(tekst[i + 1] || "")) return false;

  // Forkortelser: se på ordet umiddelbart før punktummet
  const foer = tekst.slice(0, i).toLowerCase();
  const ord = foer.match(/[a-zæøå.]+$/)?.[0] || "";
  if (FORKORTELSER.includes(ord)) return false;

  // Initialer og etbogstavsforkortelser: "A." eller "s."
  if (ord.length === 1) return false;

  return true;
}

export class SaetningsSamler {
  /**
   * @param {object} [indstillinger]
   * @param {number} [indstillinger.maksLaengde] tving et snit, hvis der ikke
   *   kommer noget skilletegn — ellers står stemmen stille ved en lang remse.
   */
  constructor({ maksLaengde = 220 } = {}) {
    this.maksLaengde = maksLaengde;
    this.buffer = "";
  }

  /**
   * Tilføjer et nyt stykke tekst og returnerer de sætninger, der nu er hele
   * nok til at blive læst op.
   * @param {string} stykke
   * @returns {string[]}
   */
  tilfoej(stykke) {
    this.buffer += stykke;
    const faerdige = [];

    for (;;) {
      const snit = this.findSnit();
      if (snit === -1) break;
      const saetning = this.buffer.slice(0, snit).trim();
      this.buffer = this.buffer.slice(snit);
      if (saetning) faerdige.push(saetning);
    }

    return faerdige;
  }

  /** Finder hvor der kan klippes, eller -1. */
  findSnit() {
    for (let i = 0; i < this.buffer.length; i++) {
      if (!erAfslutning(this.buffer, i)) continue;
      // Der skal stå noget efter tegnet, før vi tør klippe — ellers ved vi
      // ikke, om punktummet var slutningen eller starten på "1.500".
      if (i + 1 >= this.buffer.length) continue;
      if (!/\s/.test(this.buffer[i + 1]) && this.buffer[i] !== "\n") continue;
      return i + 1;
    }

    if (this.buffer.length > this.maksLaengde) {
      const mellemrum = this.buffer.lastIndexOf(" ", this.maksLaengde);
      if (mellemrum > 0) return mellemrum + 1;
    }

    return -1;
  }

  /** Alt det, der er tilbage, når replikken er færdig. */
  rest() {
    const rest = this.buffer.trim();
    this.buffer = "";
    return rest;
  }
}
