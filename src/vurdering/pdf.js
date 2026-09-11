/**
 * Bygger vurderingen som PDF i browseren.
 *
 * Dokumentet dannes hos den studerende og sendes ingen steder hen — det er
 * forudsætningen for, at intet gemmes. Lukker fanen, inden filen er hentet,
 * er vurderingen væk.
 */

import { BLOKKE } from "../eksamen/blokke.js";
import { DAEKNING } from "../eksamen/klokke.js";

const MARGEN = 20;
const SIDEBREDDE = 210;
const SIDEHOEJDE = 297;
const TEKSTBREDDE = SIDEBREDDE - 2 * MARGEN;

const NAVY = [28, 43, 58];
const SLATE = [45, 66, 87];
const BURGUNDY = [107, 39, 55];
const LINJE = [200, 194, 184];

function datoIdag() {
  return new Date().toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusOrd(d) {
  if (d === DAEKNING.DAEKKET) return "Dækket";
  if (d === DAEKNING.DELVIST) return "Delvist";
  return "Ikke nået";
}

/** Holder styr på skrivepositionen og skifter side, når papiret slipper op. */
class Side {
  constructor(doc) {
    this.doc = doc;
    this.y = MARGEN;
  }

  plads(hoejde) {
    if (this.y + hoejde > SIDEHOEJDE - MARGEN - 12) {
      this.doc.addPage();
      this.y = MARGEN;
    }
  }

  afstand(mm) {
    this.y += mm;
  }

  overskrift(tekst) {
    this.plads(14);
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(...NAVY);
    this.doc.text(tekst, MARGEN, this.y);
    this.y += 6;
  }

  broedtekst(tekst, { farve = SLATE, stoerrelse = 11, indryk = 0 } = {}) {
    if (!tekst) return;
    this.doc.setFont("times", "normal");
    this.doc.setFontSize(stoerrelse);
    this.doc.setTextColor(...farve);
    const linjer = this.doc.splitTextToSize(tekst, TEKSTBREDDE - indryk);
    const linjehoejde = stoerrelse * 0.5;
    for (const linje of linjer) {
      this.plads(linjehoejde);
      this.doc.text(linje, MARGEN + indryk, this.y);
      this.y += linjehoejde;
    }
  }

  punkt(tekst) {
    this.doc.setFont("times", "normal");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...SLATE);
    this.plads(6);
    this.doc.text("•", MARGEN, this.y);
    this.broedtekst(tekst, { indryk: 5 });
    this.y += 1.5;
  }

  streg() {
    this.plads(6);
    this.doc.setDrawColor(...LINJE);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGEN, this.y, SIDEBREDDE - MARGEN, this.y);
    this.y += 6;
  }
}

function sidefod(doc) {
  const antal = doc.getNumberOfPages();
  for (let i = 1; i <= antal; i++) {
    doc.setPage(i);
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);
    doc.text(
      "Vejledende vurdering fra træningsværktøj. Dækker alene den mundtlige præstation og er ikke en eksamenskarakter.",
      MARGEN,
      SIDEHOEJDE - 12
    );
    doc.text(`${i} af ${antal}`, SIDEBREDDE - MARGEN, SIDEHOEJDE - 12, { align: "right" });
  }
}

/**
 * @param {object} data
 * @param {object} data.vurdering modellens vurdering
 * @param {object} data.daekning  hvor langt den studerende nåede
 * @param {string} data.tilstand  med_rapport | uden_rapport
 */
export async function byggVurderingsPdf({ vurdering, daekning, tilstand }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const s = new Side(doc);

  // Hoved
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text("ERHVERVSAKADEMI DANIA · MARKEDSFØRINGSØKONOM AK", MARGEN, s.y);
  s.y += 9;

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text("Vurdering af mundtlig præstation", MARGEN, s.y);
  s.y += 7;

  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...SLATE);
  doc.text(
    `Tema 6, Internationalisering · ${
      tilstand === "med_rapport" ? "eksamination i projekt og modeller" : "eksamination i modellerne"
    } · ${datoIdag()}`,
    MARGEN,
    s.y
  );
  s.y += 4;
  s.streg();

  // Karakteren
  s.plads(24);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text("VEJLEDENDE KARAKTER", MARGEN, s.y);
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.setTextColor(...BURGUNDY);
  doc.text(String(vurdering.karakter), MARGEN, s.y + 13);
  s.y += 20;
  s.afstand(3);

  s.broedtekst(vurdering.begrundelse);
  s.afstand(5);
  s.streg();

  s.overskrift("Hovedindtryk");
  s.broedtekst(vurdering.hovedindtryk);
  s.afstand(4);

  if (vurdering.styrker?.length) {
    s.overskrift("Det sad godt");
    vurdering.styrker.forEach((t) => s.punkt(t));
    s.afstand(3);
  }

  if (vurdering.forbedringer?.length) {
    s.overskrift("Det bør du arbejde med");
    vurdering.forbedringer.forEach((t) => s.punkt(t));
    s.afstand(3);
  }

  s.overskrift("De syv områder");
  const efterBlok = new Map((vurdering.omraader || []).map((o) => [o.blokId, o.vurdering]));
  for (const blok of BLOKKE) {
    const linje = efterBlok.get(blok.id);
    s.plads(12);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(blok.navn, MARGEN, s.y);

    doc.setFont("times", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE);
    doc.text(statusOrd(daekning?.[blok.id]), SIDEBREDDE - MARGEN, s.y, { align: "right" });
    s.y += 5;

    s.broedtekst(linje || "Området blev ikke berørt inden for de femten minutter.", {
      stoerrelse: 10.5,
    });
    s.afstand(3.5);
  }

  s.afstand(4);
  s.streg();
  s.broedtekst(
    "Karakteren er sat efter 7-trins-skalaen ud fra læringsmålene for fagelementet Internationalisering, men dækker alene det, du sagde i denne samtale. Ved den rigtige prøve gives én samlet karakter for projektet og den mundtlige præstation under ét, og den kan dette værktøj ikke forudsige.",
    { stoerrelse: 10 }
  );

  sidefod(doc);
  return doc;
}

export async function hentVurderingsPdf(data) {
  const doc = await byggVurderingsPdf(data);
  const dato = new Date().toISOString().slice(0, 10);
  doc.save(`vurdering-tema6-${dato}.pdf`);
}

/** Til afprøvning: dokumentet som bytes, uden at gemme det. */
export async function vurderingsPdfBytes(data) {
  const doc = await byggVurderingsPdf(data);
  return doc.output("arraybuffer");
}
