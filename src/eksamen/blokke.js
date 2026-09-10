/**
 * De syv blokke i Tema 6-eksaminationen, med tidsbudget og spørgeramme.
 *
 * Spørgerammen stammer fra underviserens eksaminationsark. Rediger frit heri —
 * `minutter` fordeler de 15 minutter mellem blokkene, og summen bør give 15.
 */

export const EKSAMENSTID_SEK = 15 * 60;

export const BLOKKE = [
  {
    id: "motiv",
    navn: "Eksportmotiv og internationaliseringsteori",
    minutter: 1.5,
    emner: [
      "Eksportmotiv: proaktivt eller reaktivt, internt eller eksternt",
      "Uppsala-modellen og hvilket trin virksomheden er på",
      "Om Born Global er en mere passende beskrivelse",
    ],
  },
  {
    id: "screening",
    navn: "Markedsudvælgelse og screening",
    minutter: 5,
    emner: [
      "Valg af screeningmetode: tilfældig, nærmarked eller tragt",
      "Makroscreening og knock-out-kriterier: hvilket land blev fravalgt og hvorfor",
      "PESTEL med vægt på den makroøkonomiske analyse",
      "Konjunkturvurdering: ledighed mod strukturel ledighed, inflation mod 2 %-målet",
      "Forventet penge- og finanspolitik givet konjunkturen, vist i SE/SU-modellen",
      "Mikroscreening: Hofstedes seks dimensioner og afvigelserne fra Danmark",
      "Om kulturforskellene giver anledning til at justere parametermixet",
      "Markedsanalyse, efterspørgsel: markedsstørrelse, SMP, SMUK, købsadfærd",
      "Markedsanalyse, udbud: konkurrenceform, Porters fem kræfter, største konkurrenter",
      "Valg af land ud fra sammenligning og pointtildeling",
    ],
  },
  {
    id: "entry",
    navn: "Indtrængningsstrategi",
    minutter: 1.5,
    emner: [
      "Hollensens tre hovedformer: eksport, mellemled og hierarkisk",
      "Den valgte indtrængningsstrategi og begrundelsen for den",
      "Fordele og ulemper ved den valgte form frem for alternativerne",
    ],
  },
  {
    id: "markedsfoering",
    navn: "Markedsføring og parametermix",
    minutter: 2,
    emner: [
      "De fire P'er og valget mellem standardisering og tilpasning",
      "Om kultur- og markedsanalysen kan genfindes i parametermixet",
      "Content plan: hvad, hvornår, til hvilken pris og med hvilken effekt",
    ],
  },
  {
    id: "implementering",
    navn: "Implementering og aktivitetsbudget",
    minutter: 1.5,
    emner: [
      "Aktivitetsbudgettets opbygning: omsætning, variable omkostninger, markedsføring, øvrige faste omkostninger",
      "Dækningsbidraget og dets vej ind i investeringskalkulen",
    ],
  },
  {
    id: "investering",
    navn: "Investering",
    minutter: 2,
    emner: [
      "Hvad en investeringskalkule indeholder",
      "Den valgte kalkulationsrente og begrundelsen for den",
      "Følsomhedsanalysen og hvad den viser om beslutningens robusthed",
    ],
  },
  {
    id: "finansiering",
    navn: "Finansiering",
    minutter: 1.5,
    emner: [
      "Egenkapital eller fremmedkapital, og afvejningen mellem dem",
      "Valg af låntype og beregningen bag",
    ],
  },
];

/** Blokkenes tidsbudget i sekunder, akkumuleret fra eksamenens start. */
export const BLOK_PLAN = BLOKKE.reduce((acc, blok) => {
  const start = acc.length ? acc[acc.length - 1].slut : 0;
  acc.push({ id: blok.id, start, slut: start + Math.round(blok.minutter * 60) });
  return acc;
}, []);

export function findBlok(id) {
  return BLOKKE.find((b) => b.id === id) || null;
}
