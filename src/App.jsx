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
import { hentReplik, uploadRapport, sletRapport, MAKS_RAPPORT_BYTES } from "./eksamen/klient.js";
import Styles from "./Styles.jsx";

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
        Eksaminator stiller spørgsmålene, og du svarer. Du får ingen rettelser undervejs —
        ligesom til den rigtige prøve. Kan du ikke svare, får du ét hjælpespørgsmål, og så
        går eksaminator videre. Uret stopper ikke, og du kan ikke tage en pause.
      </div>

      <div className="tl-callout">
        <b>Om dine data</b>
        <br />
        Det, du siger, og den rapport du eventuelt lægger op, sendes til Anthropic uden for
        EU for at kunne behandles. Intet gemmes hos os: der er ingen database, rapporten
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
    if (tilstand === "uden_rapport") {
      start({ tilstand: "uden_rapport", fileId: null });
      return;
    }
    if (!fil) {
      setFejl("Vælg din rapport som PDF først.");
      return;
    }
    setArbejder(true);
    try {
      const fileId = await uploadRapport(fil);
      start({ tilstand: "med_rapport", fileId });
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
            Kun PDF, højst {Math.round(MAKS_RAPPORT_BYTES / (1024 * 1024) * 10) / 10} MB. Figurer,
            tabeller og beregninger læses med, så eksaminator kan spørge til dem.
          </p>
        </div>
      )}

      {fejl && <p className="tl-err">{fejl}</p>}

      <div className="tl-btnrow">
        <button className="tl-btn accent" onClick={begynd} disabled={arbejder}>
          {arbejder ? (
            <>
              <span className="tl-spinner" />
              Lægger rapporten op…
            </>
          ) : (
            "Start eksamen"
          )}
        </button>
      </div>
    </div>
  );
}

/* --------------------------- skærm 3: eksaminationen --------------------------- */

function Eksamen({ tilstand, fileId, faerdig }) {
  const [state, setState] = useState(() => nyEksamen());
  const [historik, setHistorik] = useState([]);
  const [notater, setNotater] = useState([]);
  const [live, setLive] = useState("");
  const [svar, setSvar] = useState("");
  const [venter, setVenter] = useState(true);
  const [fejl, setFejl] = useState("");
  const [nu, setNu] = useState(() => Date.now());
  const startet = useRef(false);
  const bund = useRef(null);

  const status = tidsstatus(state, nu);
  const blok = findBlok(state.blokId);

  useEffect(() => {
    const id = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Rul samtalen ned, uden at flytte hele siden.
  useEffect(() => {
    const felt = bund.current;
    if (felt) felt.scrollTop = felt.scrollHeight;
  }, [historik, live]);

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

  const modtag = useCallback((replik, bogfoering, blokId, tidspunkt) => {
    setHistorik((h) => [...h, { rolle: "eksaminator", tekst: replik }]);
    setLive("");
    if (bogfoering?.notat) {
      setNotater((n) => [
        ...n,
        { blokId, notat: bogfoering.notat, status: bogfoering.blokStatus },
      ]);
    }
    setState((s) => efterTur(s, bogfoering || {}, tidspunkt));
  }, []);

  // Første spørgsmål. Uret starter først, når eksaminator har talt.
  useEffect(() => {
    if (startet.current) return;
    startet.current = true;

    (async () => {
      try {
        const frisk = nyEksamen();
        const { tekst, bogfoering } = await hentReplik(
          { handling: "start", tilstand, fileId, styring: byggStyring(frisk, Date.now()) },
          setLive
        );
        const tidspunkt = Date.now();
        setState({ ...frisk, startTid: tidspunkt, blokStartTid: tidspunkt });
        setNu(tidspunkt);
        modtag(tekst, bogfoering, frisk.blokId, tidspunkt);
      } catch (e) {
        setFejl(e.message);
      } finally {
        setVenter(false);
      }
    })();
  }, [tilstand, fileId, byggStyring, modtag]);

  async function send() {
    const tekst = svar.trim();
    if (!tekst || venter || state.faerdig) return;

    const tidspunkt = Date.now();
    const nyHistorik = [...historik, { rolle: "studerende", tekst }];
    const blokId = state.blokId;

    setHistorik(nyHistorik);
    setSvar("");
    setLive("");
    setVenter(true);
    setFejl("");

    try {
      const { tekst: replik, bogfoering } = await hentReplik(
        {
          handling: "tur",
          tilstand,
          fileId,
          historik: nyHistorik,
          styring: byggStyring(state, tidspunkt),
        },
        setLive
      );
      modtag(replik, bogfoering, blokId, Date.now());
    } catch (e) {
      setFejl(e.message);
    } finally {
      setVenter(false);
    }
  }

  // Rapporten skal væk, så snart eksamen er forbi — ikke først når fanen lukkes.
  useEffect(() => {
    if (state.faerdig) faerdig();
  }, [state.faerdig, faerdig]);

  if (state.faerdig) {
    return <Afslutning state={state} notater={notater} />;
  }

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
              {historik.length === 0 && tilstand === "med_rapport"
                ? "læser din rapport…"
                : "…"}
            </p>
          </div>
        )}
      </div>

      {fejl && <p className="tl-err">{fejl}</p>}

      <div className="tl-svarfelt">
        <textarea
          className="tl-ta"
          value={svar}
          disabled={venter}
          placeholder="Skriv dit svar…"
          onChange={(e) => setSvar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
        />
        <button className="tl-btn accent" onClick={send} disabled={venter || !svar.trim()}>
          Svar
        </button>
      </div>
      <p className="tl-hint">
        {status.tidenErBrugt
          ? "Tiden er gået. Svar en sidste gang, så runder eksaminator af."
          : "Stemmen kommer i næste etape. Indtil da svarer du skriftligt — ⌘/Ctrl + Enter sender."}
      </p>
    </div>
  );
}

/* --------------------------- skærm 4: afslutning --------------------------- */

function Afslutning({ state, notater }) {
  const grad = daekningsgrad(state);

  return (
    <div className="tl-fade">
      <div className="tl-panel">
        <p className="tl-eyebrow">Eksaminationen er slut</p>
        <p className="tl-prompt">Du nåede {grad} % af pensum</p>
        <p className="tl-sub">
          Den skriftlige vurdering med karakter kommer i tredje etape. Indtil videre kan du
          se, hvordan de syv områder står.
        </p>
      </div>

      <div className="tl-oversigt">
        {BLOKKE.map((b) => {
          const d = state.daekning[b.id];
          const tekst =
            d === DAEKNING.DAEKKET ? "Dækket" : d === DAEKNING.DELVIST ? "Delvist" : "Ikke nået";
          return (
            <div className={"tl-raekke " + d} key={b.id}>
              <span className="navn">{b.navn}</span>
              <span className="mrk">{tekst}</span>
            </div>
          );
        })}
      </div>

      {notater.length > 0 && (
        <div className="tl-notater">
          <h4>Eksaminators notater</h4>
          {notater.map((n, i) => (
            <p key={i}>
              <b>{findBlok(n.blokId)?.navn}:</b> {n.notat}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- app --------------------------- */

export default function App() {
  const [skaerm, setSkaerm] = useState("intro");
  const [opsaetning, setOpsaetning] = useState({ tilstand: null, fileId: null });

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
