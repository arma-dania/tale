import test from "node:test";
import assert from "node:assert/strict";

import { udtraekReplik } from "./replik.js";

/** Deler en JSON-streng op i småstykker, som API'et ville streame den. */
function stykker(json, laengde = 7) {
  const ud = [];
  for (let i = 0; i < json.length; i += laengde) ud.push(json.slice(i, i + laengde));
  return ud;
}

test("intet at hente, før feltet er begyndt", () => {
  assert.equal(udtraekReplik(""), null);
  assert.equal(udtraekReplik('{"rep'), null);
  assert.equal(udtraekReplik('{"replik"'), null);
  assert.equal(udtraekReplik('{"replik":'), null);
});

test("replikken kan læses, mens den skrives", () => {
  const halv = '{"replik":"Hvad var jeres eksportmotiv';
  const r = udtraekReplik(halv);
  assert.equal(r.tekst, "Hvad var jeres eksportmotiv");
  assert.equal(r.afsluttet, false);
});

test("afsluttet streng markeres, og resten af objektet ignoreres", () => {
  const hel = '{"replik":"Hvorfor Polen?","blokStatus":"delvist","gaaVidere":true}';
  const r = udtraekReplik(hel);
  assert.equal(r.tekst, "Hvorfor Polen?");
  assert.equal(r.afsluttet, true);
});

test("escapede tegn afkodes", () => {
  const r = udtraekReplik('{"replik":"Du sagde \\"nej\\" — hvorfor?","blokStatus":"delvist"}');
  assert.equal(r.tekst, 'Du sagde "nej" — hvorfor?');
  assert.equal(r.afsluttet, true);
});

test("en halv escape-sekvens vælter ikke afkodningen", () => {
  assert.equal(udtraekReplik('{"replik":"linje\\').tekst, "linje");
  assert.equal(udtraekReplik('{"replik":"tegn \\u00e').tekst, "tegn ");
  assert.equal(udtraekReplik('{"replik":"tegn \\u00e6').tekst, "tegn æ");
});

test("teksten vokser monotont stykke for stykke", () => {
  const svar = {
    replik: 'Godt. Hvorfor valgte I "direkte eksport" frem for en agent?\nBegrund det.',
    blokStatus: "delvist",
    gaaVidere: false,
    varHjaelpespoergsmaal: false,
    afslut: false,
    notat: "Kender formerne, mangler begrundelsen.",
  };
  const json = JSON.stringify(svar);

  let samlet = "";
  let sidste = "";
  for (const stykke of stykker(json)) {
    samlet += stykke;
    const r = udtraekReplik(samlet);
    if (!r) continue;
    assert.ok(r.tekst.startsWith(sidste), "teksten må aldrig skrumpe eller ændre sig bagud");
    sidste = r.tekst;
  }
  assert.equal(sidste, svar.replik);
  assert.equal(udtraekReplik(json).afsluttet, true);
});

test("felter før replik forstyrrer ikke", () => {
  const r = udtraekReplik('{"notat":"noget om replik","replik":"Det rigtige spørgsmål"}');
  assert.equal(r.tekst, "Det rigtige spørgsmål");
});

test("ordet replik inde i en anden værdi narrer os ikke", () => {
  const r = udtraekReplik('{"notat":"hun sagde \\"replik\\" igen","replik":"Det rigtige"}');
  assert.equal(r.tekst, "Det rigtige");
});
