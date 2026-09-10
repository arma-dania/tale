/**
 * Uret og tempostyringen.
 *
 * Modellen bestemmer, HVAD der spørges om, og om et svar er dækkende.
 * Koden her bestemmer, HVORNÅR der lukkes ned for en blok — ellers er der
 * ingen garanti for, at den studerende når hele vejen rundt på 15 minutter.
 *
 * Tidsbudgettet fordeles løbende: når en blok har taget for lang tid, deles
 * den resterende tid på ny mellem de blokke, der mangler, efter deres vægt.
 * Så æder en lang snak om screening ikke finansieringen helt op.
 */

import { BLOKKE, EKSAMENSTID_SEK } from "./blokke.js";

export const DAEKNING = {
  IKKE: "ikke_beroert",
  DELVIST: "delvist",
  DAEKKET: "daekket",
};

/** Sidste 90 sekunder bruges til at runde af. */
const AFRUNDING_SEK = 90;

export function nyEksamen(nu = Date.now()) {
  return {
    startTid: nu,
    blokStartTid: nu,
    blokId: BLOKKE[0].id,
    blokBudget: beregnBudget(BLOKKE[0].id, EKSAMENSTID_SEK),
    daekning: Object.fromEntries(BLOKKE.map((b) => [b.id, DAEKNING.IKKE])),
    hjaelpBrugt: Object.fromEntries(BLOKKE.map((b) => [b.id, false])),
    faerdig: false,
  };
}

function blokIndeks(blokId) {
  const i = BLOKKE.findIndex((b) => b.id === blokId);
  return i === -1 ? 0 : i;
}

export function naesteBlokId(blokId) {
  const i = blokIndeks(blokId);
  return i < BLOKKE.length - 1 ? BLOKKE[i + 1].id : null;
}

/**
 * Hvor lang tid en blok må tage, når der er `tilbage` sekunder igen af eksamenen.
 * Den resterende tid deles mellem de blokke, der mangler, efter deres vægt —
 * så en blok, der er løbet over tiden, beskærer de følgende i stedet for at
 * æde dem helt. Budgettet lægges fast, når blokken begynder, og ændrer sig
 * ikke undervejs.
 */
export function beregnBudget(blokId, tilbage) {
  const resterende = BLOKKE.slice(blokIndeks(blokId));
  const samletVaegt = resterende.reduce((sum, b) => sum + b.minutter, 0);
  if (samletVaegt === 0) return Math.max(0, tilbage);
  return Math.round(Math.max(0, tilbage) * (resterende[0].minutter / samletVaegt));
}

/** Den aktuelle blok tidsbudget, låst fast da blokken begyndte. */
export function blokBudgetSek(state) {
  return state.blokBudget ?? beregnBudget(state.blokId, EKSAMENSTID_SEK);
}

export function forloebetSek(state, nu = Date.now()) {
  return Math.max(0, Math.round((nu - state.startTid) / 1000));
}

export function tilbageSek(state, nu = Date.now()) {
  return Math.max(0, EKSAMENSTID_SEK - forloebetSek(state, nu));
}

/**
 * Samlet tidsbillede til brug i UI og i prompten til modellen.
 */
export function tidsstatus(state, nu = Date.now()) {
  const forloebet = forloebetSek(state, nu);
  const tilbage = tilbageSek(state, nu);
  const iBlok = Math.max(0, Math.round((nu - state.blokStartTid) / 1000));
  const budget = blokBudgetSek(state);
  const sidsteBlok = naesteBlokId(state.blokId) === null;

  return {
    forloebet,
    tilbage,
    iBlok,
    blokBudget: budget,
    blokTilbage: Math.max(0, budget - iBlok),
    tidenErBrugt: tilbage <= 0,
    afrunding: tilbage <= AFRUNDING_SEK,
    /** Blokkens tid er brugt — der skal skiftes videre nu. */
    skalSkifte: !sidsteBlok && iBlok >= budget,
    sidsteBlok,
  };
}

/**
 * Opdaterer eksamenens tilstand efter en tur.
 *
 * `svar` er modellens strukturerede bogføring: hvordan blokken står nu, om
 * den selv vil videre, og om replikken var et hjælpespørgsmål.
 */
export function efterTur(state, svar, nu = Date.now()) {
  const status = tidsstatus(state, nu);
  const naeste = { ...state };

  if (svar.blokStatus && Object.values(DAEKNING).includes(svar.blokStatus)) {
    naeste.daekning = { ...state.daekning, [state.blokId]: svar.blokStatus };
  }
  if (svar.varHjaelpespoergsmaal) {
    naeste.hjaelpBrugt = { ...state.hjaelpBrugt, [state.blokId]: true };
  }

  // Skift blok når enten uret siger stop, eller modellen selv er færdig med blokken.
  const vilVidere = svar.gaaVidere === true;
  if (!status.sidsteBlok && (status.skalSkifte || vilVidere)) {
    naeste.blokId = naesteBlokId(state.blokId);
    naeste.blokStartTid = nu;
    naeste.blokBudget = beregnBudget(naeste.blokId, status.tilbage);
  }

  if (status.tidenErBrugt || svar.afslut === true) {
    naeste.faerdig = true;
  }

  return naeste;
}

/**
 * Hvor stor en del af pensum den studerende nåede igennem.
 * En delvist dækket blok tæller halvt.
 */
export function daekningsgrad(state) {
  const point = BLOKKE.reduce((sum, b) => {
    const d = state.daekning[b.id];
    if (d === DAEKNING.DAEKKET) return sum + 1;
    if (d === DAEKNING.DELVIST) return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((point / BLOKKE.length) * 100);
}

export function formatTid(sek) {
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
