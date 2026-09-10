/**
 * Test af tempostyringen: kør med `npm test`.
 *
 * Det er den logik, der afgør, om den studerende når hele vejen rundt,
 * så den bør ikke kunne gå i stykker ubemærket.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { BLOKKE, EKSAMENSTID_SEK } from "./blokke.js";
import {
  DAEKNING,
  nyEksamen,
  naesteBlokId,
  tidsstatus,
  efterTur,
  daekningsgrad,
  blokBudgetSek,
} from "./klokke.js";

const T0 = 1_700_000_000_000;
const sek = (n) => T0 + n * 1000;

test("blokkenes tidsbudget summer til eksamenstiden", () => {
  const total = BLOKKE.reduce((s, b) => s + b.minutter * 60, 0);
  assert.equal(total, EKSAMENSTID_SEK);
});

test("ny eksamen starter i første blok med alt uberørt", () => {
  const s = nyEksamen(T0);
  assert.equal(s.blokId, BLOKKE[0].id);
  assert.equal(daekningsgrad(s), 0);
  assert.equal(s.faerdig, false);
});

test("uret skifter blok når blokkens budget er brugt", () => {
  const s = nyEksamen(T0);
  const budget = blokBudgetSek(s);

  assert.equal(tidsstatus(s, sek(budget - 5)).skalSkifte, false);
  assert.equal(tidsstatus(s, sek(budget + 1)).skalSkifte, true);

  const efter = efterTur(s, { blokStatus: DAEKNING.DELVIST }, sek(budget + 1));
  assert.equal(efter.blokId, BLOKKE[1].id);
  assert.equal(efter.daekning[BLOKKE[0].id], DAEKNING.DELVIST);
});

test("modellen kan gå videre før tiden er brugt", () => {
  const s = nyEksamen(T0);
  const efter = efterTur(s, { blokStatus: DAEKNING.DAEKKET, gaaVidere: true }, sek(20));
  assert.equal(efter.blokId, BLOKKE[1].id);
  assert.equal(efter.daekning[BLOKKE[0].id], DAEKNING.DAEKKET);
});

test("resterende tid fordeles på ny, når en blok er løbet over tiden", () => {
  // Første blok får lov at æde fem minutter af de femten.
  let s = nyEksamen(T0);
  s = efterTur(s, { blokStatus: DAEKNING.DELVIST, gaaVidere: true }, sek(300));

  const budget = blokBudgetSek(s);
  const resterendeVaegt = BLOKKE.slice(1).reduce((sum, b) => sum + b.minutter, 0);
  const forventet = Math.round((EKSAMENSTID_SEK - 300) * (BLOKKE[1].minutter / resterendeVaegt));

  assert.equal(budget, forventet);
  assert.ok(budget < BLOKKE[1].minutter * 60, "blokken skal beskæres, ikke beholde sit oprindelige budget");
});

test("hele pensum kan nås, selv når hver blok bruger sit budget fuldt ud", () => {
  let s = nyEksamen(T0);
  let nu = T0;

  for (let i = 0; i < BLOKKE.length; i++) {
    const budget = blokBudgetSek(s);
    nu = nu + (budget + 1) * 1000;
    s = efterTur(s, { blokStatus: DAEKNING.DAEKKET }, nu);
  }

  assert.equal(daekningsgrad(s), 100);
  assert.ok(tidsstatus(s, nu).forloebet <= EKSAMENSTID_SEK + BLOKKE.length,
    "afrunding må højst koste et sekund per blok");
});

test("hjælpespørgsmål bogføres per blok", () => {
  const s = nyEksamen(T0);
  const efter = efterTur(s, { varHjaelpespoergsmaal: true }, sek(10));
  assert.equal(efter.hjaelpBrugt[BLOKKE[0].id], true);
  assert.equal(efter.hjaelpBrugt[BLOKKE[1].id], false);
});

test("sidste blok skifter ikke videre, og eksamen slutter når tiden er gået", () => {
  let s = { ...nyEksamen(T0), blokId: BLOKKE[BLOKKE.length - 1].id };
  assert.equal(naesteBlokId(s.blokId), null);

  const status = tidsstatus(s, sek(EKSAMENSTID_SEK + 10));
  assert.equal(status.skalSkifte, false);
  assert.equal(status.tidenErBrugt, true);

  s = efterTur(s, {}, sek(EKSAMENSTID_SEK + 10));
  assert.equal(s.faerdig, true);
});

test("delvist dækkede blokke tæller halvt", () => {
  let s = nyEksamen(T0);
  s.daekning = {
    ...s.daekning,
    [BLOKKE[0].id]: DAEKNING.DAEKKET,
    [BLOKKE[1].id]: DAEKNING.DELVIST,
  };
  assert.equal(daekningsgrad(s), Math.round((1.5 / BLOKKE.length) * 100));
});
