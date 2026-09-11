import React, { useState, useEffect, useRef, useCallback } from "react";

import { BLOKKE, findBlok } from "./eksamen/blokke.js";
import {
  nyEksamen,
  tidsstatus,
  efterTur,
  daekningsgrad,
  formatTid,
  DAEKNING,
} from "./eksamen/klokke.js";
import {
  hentReplik,
  hentVurdering,
  uploadRapport,
  sletRapport,
  MAKS_RAPPORT_BYTES,
} from "./eksamen/klient.js";
import { hentVurderingsPdf } from "./vurdering/pdf.js";
import { SaetningsSamler } from "./stemme/saetninger.js";
import { Stemme, bedOmMikrofon, SVAR_SLUT_STILHED_MS } from "./stemme/stemme.js";
import Styles from "./Styles.jsx";

/** Hvor længe der ventes på et svar, der aldrig kommer, før eksaminator går videre. */
const INTET_SVAR_MS = 20000;

/* --------------------------- skærm 1: introduktion --------------------------- */

function Intro({ videre }) {
  return (
    <div className="tl-fade">
      <p className="tl-lead" style={{ marginTop: 0 }}>
        Her kan du træne den mundtlige prøve i Tema 6, Internationalisering. Prøven varer
        femten minutter, præcis som til eksamen, og du bliver ført igennem alle syv
        områder undervejs. Bagefter får du en skriftlig vurdering.
      </p>

      <div className="tl-callout">
        <b>Sådan foregår det</b>
        <br />
        Eksaminator stiller spørgsmålene, og du svarer — du taler, og der bliver talt
        tilbage. Du får ingen rettelser undervejs, ligesom til den rigtige prøve. Kan du
        ikke svare, får du ét hjælpespørgsmål, og så går eksaminator videre. Uret stopper
        ikke, og du kan ikke tage en pause.
      </div>

      <div className="tl-callout">
        <b>Om dine data</b>
        <br />
        Din stemme sendes til Microsoft for at blive omsat til tekst og tilbage til tale,
        og samtalen og den rapport, du eventuelt lægger op, sendes til Anthropic. Begge
        dele foregår uden for EU. Intet gemmes hos os: der er ingen database, rapporten
        slettes, når du er færdig, og lukker du fanen, er alt væk — også din vurdering.
        Hent den, inden du lukker.
      </div>

      <div className="tl-btnrow">
        <button className="tl-btn accent" onClick={videre}>
          Jeg er indforstået — kom i gang
        </button>
      </div>
    </div>
  );
}

/* --------------------------- skærm 2: opsætning --------------------------- */

function Opsaetning({ start }) {
  const [tilstand, setTilstand] = useState("med_rapport");
  const [fil, setFil] = useState(null);
  const [fejl, setFejl] = useState("");
  const [arbejder, setArbejder] = useState(false);

  async function begynd() {
    setFejl("");
    if (tilstand === "med_rapport" && !fil) {
      setFejl("Vælg din rapport som PDF først.");
      return;
    }
    setArbejder(true);

    // Mikrofonen skal spørges om lov nu, mens trykket på knappen stadig
    // gælder som et samtykke i browseren.
    let stemmeAktiv = true;
    let stemmeFejl = "";
    try {
      await bedOmMikrofon();
    } catch {
      stemmeAktiv = false;
      stemmeFejl = "Der er ikke adgang til mikrofonen, så eksamen føres skriftligt.";
    }

    try {
      const fileId = tilstand === "med_rapport" ? await uploadRapport(fil) : null;
      start({ tilstand, fileId, stemmeAktiv, stemmeFejl });
    } catch (e) {
      setFejl(e.message);
      setArbejder(false);
    }
  }

  return (
    <div className="tl-fade">
      <p className="tl-eyebrow">Vælg prøveform</p>
      <div className="tl-valg">
        <button
          className={"tl-kort" + (tilstand === "med_rapport" ? " valgt" : "")}
          onClick={() => setTilstand("med_rapport")}
        >
          <h3>Med rapport</h3>
          <p>
            Du lægger jeres projekt op, og eksaminator spørger både til modellerne og til
            jeres anvendelse af dem. Det svarer til den rigtige prøve.
          </p>
        </button>
        <button
          className={"tl-kort" + (tilstand === "uden_rapport" ? " valgt" : "")}
          onClick={() => setTilstand("uden_rapport")}
        >
          <h3>Uden rapport</h3>
          <p>
            Eksaminator spørger til modellerne selv og beder om dine egne eksempler. God
            træning, før projektet er afleveret.
          </p>
        </button>
      </div>

      {tilstand === "med_rapport" && (
        <div className="tl-upload">
          <label className="tl-filvalg">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                setFejl("");
                setFil(e.target.files?.[0] || null);
              }}
            />
            <span>{fil ? fil.name : "Vælg din rapport (PDF)"}</span>
          </label>
          <p className="tl-hint">
            Kun PDF, højst {Math.round((MAKS_RAPPORT_BYTES / (1024 * 1024)) * 10) / 10} MB.
            Figurer, tabeller og beregninger læses med, så eksaminator kan spørge til dem.
          </p>
        </div>
      )}

      {fejl && <p className="tl-err">{fejl}</p>}

      <div className="tl-btnrow">
        <button className="tl-btn accent" onClick={begynd} disabled={arbejder}>
          {arbejder ? (
            <>
              <span className="tl-spinner" />
              Gør klar…
            </>
          ) : (
            "Start eksamen"
          )}
        </button>
      </div>
      <p className="tl-hint">
        Brug gerne headset. Værktøjet åbner mikrofonen, når du trykker.
      </p>
    </div>
  );
}

/* --------------------------- skærm 3: eksaminationen --------------------------- */

function Eksamen({ tilstand, fileId, stemmeAktiv, stemmeFejlFraStart, faerdig }) {
  const [state, setState] = useState(() => nyEksamen());
  const [historik, setHistorik] = useState([]);
  const [notater, setNotater] = useState([]);
  const [live, setLive] = useState("");
  const [svar, setSvar] = useState("");
  const [venter, setVenter] = useState(true);
  const [fejl, setFejl] = useState("");
  const [nu, setNu] = useState(() => Date.now());

  const [medStemme, setMedStemme] = useState(stemmeAktiv);
  const [stemmeBesked, setStemmeBesked] = useState(stemmeFejlFraStart || "");
  const [taleTilstand, setTaleTilstand] = useState("stille"); // stille | taler | lytter
  const [delvis, setDelvis] = useState("");

  const startet = useRef(false);
  const bund = useRef(null);
  const stemmeRef = useRef(null);
  const taleKoe = useRef(Promise.resolve());
  const segmenter = useRef([]);
  const stilhedsUr = useRef(null);
  const sender = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const historikRef = useRef(historik);
  historikRef.current = historik;

  const status = tidsstatus(state, nu);
  const blok = findBlok(state.blokId);

  useEffect(() => {
    const id = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const felt = bund.current;
    if (felt) felt.scrollTop = felt.scrollHeight;
  }, [historik, live, delvis]);

  const byggStyring = useCallback((s, tidspunkt) => {
    const t = tidsstatus(s, tidspunkt);
    return {
      blokId: s.blokId,
      tilbage: t.tilbage,
      blokTilbage: t.blokTilbage,
      skalSkifte: t.skalSkifte,
      afrunding: t.afrunding,
      tidenErBrugt: t.tidenErBrugt,
      hjaelpBrugt: s.hjaelpBrugt[s.blokId],
    };
  }, []);

  /* ---------- stemmen ---------- */

  const sigIKoe = useCallback((saetning) => {
    const stemme = stemmeRef.current;
    if (!stemme || !saetning) return;
    taleKoe.current = taleKoe.current
      .then(() => stemme.sig(saetning))
      .catch((e) => setStemmeBesked(e.message || "Stemmen svigtede."));
  }, []);

  const stopStilhedsUr = useCallback(() => {
    clearTimeout(stilhedsUr.current);
    stilhedsUr.current = null;
  }, []);

  // Svaret må kun sendes én gang per lytterunde — både stilhedsuret og
  // "Færdig med svaret" peger herhen, og de kan ramme i samme øjeblik.
  const afslutSvar = useCallback(async () => {
    if (sender.current) return undefined;
    sender.current = true;
    stopStilhedsUr();
    setTaleTilstand("stille");
    setDelvis("");
    await stemmeRef.current?.stopLyt().catch(() => {});
    const tekst = segmenter.current.join(" ").trim();
    segmenter.current = [];
    return tekst;
  }, [stopStilhedsUr]);

  /* ---------- en tur ---------- */

  const koerTur = useCallback(
    async (payload, blokId) => {
      setVenter(true);
      setFejl("");
      setLive("");

      const samler = new SaetningsSamler();
      try {
        const { tekst: replik, bogfoering } = await hentReplik(payload, (samlet, stykke) => {
          setLive(samlet);
          if (stemmeRef.current) {
            setTaleTilstand("taler");
            samler.tilfoej(stykke).forEach(sigIKoe);
          }
        });

        if (stemmeRef.current) {
          sigIKoe(samler.rest());
          await taleKoe.current.catch(() => {});
        }

        const tidspunkt = Date.now();
        setHistorik((h) => [...h, { rolle: "eksaminator", tekst: replik }]);
        setLive("");
        if (bogfoering?.notat) {
          setNotater((n) => [...n, { blokId, notat: bogfoering.notat, status: bogfoering.blokStatus }]);
        }
        setState((s) => efterTur(s, bogfoering || {}, tidspunkt));
        return bogfoering;
      } catch (e) {
        setFejl(e.message);
        return null;
      } finally {
        setVenter(false);
        setTaleTilstand("stille");
      }
    },
    [sigIKoe]
  );

  /* ---------- lyt efter den studerendes svar ---------- */

  const sendSvar = useCallback(
    async (tekst) => {
      const tidspunkt = Date.now();
      const blokId = stateRef.current.blokId;
      const nyHistorik = [...historikRef.current, { rolle: "studerende", tekst }];
      setHistorik(nyHistorik);
      setSvar("");

      await koerTur(
        {
          handling: "tur",
          tilstand,
          fileId,
          historik: nyHistorik,
          styring: byggStyring(stateRef.current, tidspunkt),
        },
        blokId
      );
    },
    [koerTur, byggStyring, tilstand, fileId]
  );

  const startLytning = useCallback(async () => {
    const stemme = stemmeRef.current;
    if (!stemme || stateRef.current.faerdig) return;

    segmenter.current = [];
    sender.current = false;
    setDelvis("");
    setTaleTilstand("lytter");

    const slutSvaret = async () => {
      const tekst = await afslutSvar();
      if (tekst === undefined) return;
      await sendSvar(tekst);
    };

    const nulstil = (ms) => {
      clearTimeout(stilhedsUr.current);
      stilhedsUr.current = setTimeout(slutSvaret, ms);
    };

    try {
      await stemme.lyt({
        paaDelvist: (t) => {
          setDelvis(t);
          nulstil(SVAR_SLUT_STILHED_MS);
        },
        paaSegment: (t) => {
          segmenter.current.push(t);
          setDelvis("");
          nulstil(SVAR_SLUT_STILHED_MS);
        },
        paaFejl: (b) => setStemmeBesked(b),
      });
      // Siger den studerende slet ingenting, går eksaminator videre af sig selv.
      nulstil(INTET_SVAR_MS);
    } catch (e) {
      setStemmeBesked((e.message || "Mikrofonen kunne ikke åbnes.") + " Skriv dit svar i stedet.");
      setMedStemme(false);
      setTaleTilstand("stille");
    }
  }, [afslutSvar, sendSvar]);

  /* ---------- opstart ---------- */

  useEffect(() => {
    if (startet.current) return;
    startet.current = true;

    (async () => {
      if (stemmeAktiv) {
        try {
          stemmeRef.current = await Stemme.opret();
        } catch (e) {
          stemmeRef.current = null;
          setMedStemme(false);
          setStemmeBesked((e.message || "Stemmen kunne ikke startes.") + " Eksamen føres skriftligt.");
        }
      }

      const frisk = nyEksamen();
      const tidspunkt = Date.now();
      setState({ ...frisk, startTid: tidspunkt, blokStartTid: tidspunkt });
      setNu(tidspunkt);

      // Mikrofonen åbnes af effekten nedenfor, når eksaminator er talt færdig.
      await koerTur(
        {
          handling: "start",
          tilstand,
          fileId,
          styring: byggStyring(frisk, tidspunkt),
        },
        frisk.blokId
      );
    })();
  }, [stemmeAktiv, tilstand, fileId, koerTur, byggStyring]);

  /* ---------- efter hver tur: lyt igen ---------- */

  const sidsteRolle = historik.length ? historik[historik.length - 1].rolle : null;
  useEffect(() => {
    if (!medStemme || !stemmeRef.current) return;
    if (venter || state.faerdig) return;
    if (sidsteRolle !== "eksaminator") return;
    if (taleTilstand === "lytter") return;
    startLytning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidsteRolle, historik.length, venter, state.faerdig, medStemme]);

  /* ---------- oprydning ---------- */

  useEffect(() => {
    if (!state.faerdig) return;
    stopStilhedsUr();
    stemmeRef.current?.luk();
    stemmeRef.current = null;
    faerdig();
  }, [state.faerdig, faerdig, stopStilhedsUr]);

  useEffect(() => {
    return () => {
      clearTimeout(stilhedsUr.current);
      stemmeRef.current?.luk();
      stemmeRef.current = null;
    };
  }, []);

  async function sendSkrevet() {
    const tekst = svar.trim();
    if (!tekst || venter || state.faerdig) return;
    await sendSvar(tekst);
  }

  async function faerdigMedSvaret() {
    const tekst = await afslutSvar();
    if (tekst === undefined) return;
    await sendSvar(tekst);
  }

  if (state.faerdig) {
    return (
      <Afslutning state={state} notater={notater} historik={historik} tilstand={tilstand} />
    );
  }

  const lytter = taleTilstand === "lytter";

  return (
    <div className="tl-fade">
      <div className="tl-status">
        <div className="tl-ur">
          <span className={"tid" + (status.afrunding ? " knap" : "")}>{formatTid(status.tilbage)}</span>
          <span className="cap">tilbage</span>
        </div>
        <div className="tl-blokspor">
          {BLOKKE.map((b) => {
            const d = state.daekning[b.id];
            const aktiv = b.id === state.blokId;
            return (
              <span
                key={b.id}
                className={
                  "prik" +
                  (aktiv ? " aktiv" : "") +
                  (d === DAEKNING.DAEKKET ? " daekket" : "") +
                  (d === DAEKNING.DELVIST ? " delvist" : "")
                }
                title={b.navn}
              />
            );
          })}
          <span className="navn">{blok?.navn}</span>
        </div>
      </div>

      <div className="tl-samtale" ref={bund}>
        {historik.map((tur, i) => (
          <div key={i} className={"tl-tur " + tur.rolle}>
            <span className="hvem">{tur.rolle === "eksaminator" ? "Eksaminator" : "Dig"}</span>
            <p>{tur.tekst}</p>
          </div>
        ))}
        {live && (
          <div className="tl-tur eksaminator">
            <span className="hvem">Eksaminator</span>
            <p>{live}</p>
          </div>
        )}
        {venter && !live && (
          <div className="tl-tur eksaminator">
            <span className="hvem">Eksaminator</span>
            <p className="tl-taenker">
              <span className="tl-spinner dark" />
              {historik.length === 0 && tilstand === "med_rapport" ? "læser din rapport…" : "…"}
            </p>
          </div>
        )}
        {delvis && (
          <div className="tl-tur studerende">
            <span className="hvem">Dig</span>
            <p className="tl-delvis">{delvis}</p>
          </div>
        )}
      </div>

      {fejl && <p className="tl-err">{fejl}</p>}
      {stemmeBesked && <p className="tl-hint tl-advarsel">{stemmeBesked}</p>}

      {medStemme ? (
        <div className="tl-mikrofon">
          <span className={"tl-lampe" + (lytter ? " lytter" : taleTilstand === "taler" ? " taler" : "")} />
          <span className="tl-tilstand">
            {taleTilstand === "taler"
              ? "Eksaminator taler"
              : lytter
                ? "Jeg lytter — sig dit svar"
                : venter
                  ? "Eksaminator tænker"
                  : "Et øjeblik"}
          </span>
          <button className="tl-btn sm" onClick={faerdigMedSvaret} disabled={!lytter}>
            Færdig med svaret
          </button>
          <button
            className="tl-link"
            onClick={() => {
              stemmeRef.current?.luk();
              stemmeRef.current = null;
              setMedStemme(false);
              setTaleTilstand("stille");
            }}
          >
            Skriv i stedet
          </button>
        </div>
      ) : (
        <>
          <div className="tl-svarfelt">
            <textarea
              className="tl-ta"
              value={svar}
              disabled={venter}
              placeholder="Skriv dit svar…"
              onChange={(e) => setSvar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendSkrevet();
              }}
            />
            <button className="tl-btn accent" onClick={sendSkrevet} disabled={venter || !svar.trim()}>
              Svar
            </button>
          </div>
          <p className="tl-hint">
            {status.tidenErBrugt
              ? "Tiden er gået. Svar en sidste gang, så runder eksaminator af."
              : "⌘/Ctrl + Enter sender."}
          </p>
        </>
      )}
    </div>
  );
}

/* --------------------------- skærm 4: afslutning --------------------------- */

function Afslutning({ state, notater, historik, tilstand }) {
  const grad = daekningsgrad(state);
  const [vurdering, setVurdering] = useState(null);
  const [fejl, setFejl] = useState("");
  const [henter, setHenter] = useState(false);
  const [sekunder, setSekunder] = useState(0);
  const [pdfFejl, setPdfFejl] = useState("");
  const bedt = useRef(false);

  const voter = useCallback(async () => {
    setHenter(true);
    setFejl("");
    setSekunder(0);
    try {
      setVurdering(
        await hentVurdering(
          {
            tilstand,
            historik,
            daekning: state.daekning,
            notater,
          },
          setSekunder
        )
      );
    } catch (e) {
      setFejl(e.message);
    } finally {
      setHenter(false);
    }
  }, [tilstand, historik, state.daekning, notater]);

  useEffect(() => {
    if (bedt.current) return;
    bedt.current = true;
    voter();
  }, [voter]);

  async function hentPdf() {
    setPdfFejl("");
    try {
      await hentVurderingsPdf({ vurdering, daekning: state.daekning, tilstand });
    } catch (e) {
      setPdfFejl(e.message || "Filen kunne ikke dannes.");
    }
  }

  return (
    <div className="tl-fade">
      <div className="tl-panel">
        <p className="tl-eyebrow">Eksaminationen er slut</p>
        {henter && (
          <>
            <p className="tl-prompt">Eksaminator voterer</p>
            <p className="tl-sub">
              <span className="tl-spinner dark" />
              Vurderingen skrives{sekunder > 3 ? ` — ${sekunder} sekunder` : " — det tager et øjeblik"}.
            </p>
          </>
        )}
        {!henter && vurdering && (
          <>
            <p className="tl-eyebrow" style={{ marginTop: 10 }}>Vejledende karakter</p>
            <p className="tl-karakter">{vurdering.karakter}</p>
            <p className="tl-sub">Du nåede {grad} % af pensum</p>
          </>
        )}
        {!henter && !vurdering && (
          <>
            <p className="tl-prompt">Du nåede {grad} % af pensum</p>
            <p className="tl-sub">Vurderingen mangler endnu.</p>
          </>
        )}
      </div>

      {fejl && (
        <>
          <p className="tl-err">{fejl}</p>
          <div className="tl-btnrow">
            <button className="tl-btn sm" onClick={voter} disabled={henter}>
              Prøv igen
            </button>
          </div>
        </>
      )}

      {vurdering && (
        <>
          <div className="tl-vurdering">
            <p>{vurdering.begrundelse}</p>
            <h4>Hovedindtryk</h4>
            <p>{vurdering.hovedindtryk}</p>

            {vurdering.styrker?.length > 0 && (
              <>
                <h4>Det sad godt</h4>
                <ul>
                  {vurdering.styrker.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </>
            )}

            {vurdering.forbedringer?.length > 0 && (
              <>
                <h4>Det bør du arbejde med</h4>
                <ul>
                  {vurdering.forbedringer.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="tl-btnrow">
            <button className="tl-btn accent" onClick={hentPdf}>
              Hent vurderingen som PDF
            </button>
          </div>
          {pdfFejl && <p className="tl-err">{pdfFejl}</p>}
          <p className="tl-hint tl-advarsel">
            Hent filen nu. Lukker du fanen, er vurderingen væk — der gemmes intet.
          </p>
        </>
      )}

      <div className="tl-oversigt">
        {BLOKKE.map((b) => {
          const d = state.daekning[b.id];
          const tekst =
            d === DAEKNING.DAEKKET ? "Dækket" : d === DAEKNING.DELVIST ? "Delvist" : "Ikke nået";
          const linje = (vurdering?.omraader || []).find((o) => o.blokId === b.id)?.vurdering;
          return (
            <div className={"tl-raekke " + d} key={b.id}>
              <div className="indhold">
                <span className="navn">{b.navn}</span>
                {linje && <span className="linje">{linje}</span>}
              </div>
              <span className="mrk">{tekst}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- app --------------------------- */

export default function App() {
  const [skaerm, setSkaerm] = useState("intro");
  const [opsaetning, setOpsaetning] = useState({
    tilstand: null,
    fileId: null,
    stemmeAktiv: false,
    stemmeFejl: "",
  });

  const rydRapport = useCallback(() => sletRapport(opsaetning.fileId), [opsaetning.fileId]);

  // Rapporten slettes, når eksamen er forbi — og hvis fanen lukkes undervejs.
  useEffect(() => {
    if (!opsaetning.fileId) return;
    window.addEventListener("pagehide", rydRapport);
    return () => window.removeEventListener("pagehide", rydRapport);
  }, [opsaetning.fileId, rydRapport]);

  return (
    <div className="tl-root">
      <Styles />
      <div className="tl-wrap">
        <p className="tl-eyebrow">Erhvervsakademi Dania · markedsføringsøkonom AK</p>
        <h1 className="tl-h1">Tema 6</h1>
        <p className="tl-undertitel">Mundtlig eksamenstræning i internationalisering</p>

        {skaerm === "intro" && <Intro videre={() => setSkaerm("opsaetning")} />}

        {skaerm === "opsaetning" && (
          <Opsaetning
            start={(valg) => {
              setOpsaetning(valg);
              setSkaerm("eksamen");
            }}
          />
        )}

        {skaerm === "eksamen" && (
          <Eksamen
            tilstand={opsaetning.tilstand}
            fileId={opsaetning.fileId}
            stemmeAktiv={opsaetning.stemmeAktiv}
            stemmeFejlFraStart={opsaetning.stemmeFejl}
            faerdig={rydRapport}
          />
        )}

        <div className="tl-footer">
          Værktøjet er træning, ikke en prøve. Vurderingen er vejledende og dækker kun den
          mundtlige præstation. Erhvervsakademi Dania.
        </div>
      </div>
    </div>
  );
}
