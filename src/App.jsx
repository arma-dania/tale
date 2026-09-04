import React, { useState, useEffect, useRef, useMemo } from "react";

/* --------------------------- SPØRGSMÅLSBANK --------------------------- */

const EMNER = {
  makro: { navn: "Makroøkonomi", kort: "BNP, konjunktur, penge- og finanspolitik" },
  mikro: { navn: "Mikroøkonomi", kort: "Udbud, efterspørgsel, markedsformer" },
  virksomhed: { navn: "Virksomhedens økonomi", kort: "Regnskab, finansiering, investering" },
  marketing: { navn: "Marketing", kort: "Segmentering, positionering, marketingmix" },
  organisation: { navn: "Organisation & ledelse", kort: "Struktur, kultur, ledelse, forandring" },
};

const SPOERGSMAAL = [
  { id: "ma1", emne: "makro", tekst: "Forklar forskellen på finanspolitik og pengepolitik, og giv et eksempel på hver.", stikord: ["finanspolitik", "pengepolitik", "renten", "offentligt forbrug", "Nationalbanken"] },
  { id: "ma2", emne: "makro", tekst: "Hvad er en højkonjunktur, og hvilke tegn kan man se i økonomien, når vi er i en?", stikord: ["konjunktur", "beskæftigelse", "inflation", "BNP-vækst", "forbrug"] },
  { id: "ma3", emne: "makro", tekst: "Beskriv sammenhængen mellem inflation og renten.", stikord: ["inflation", "rente", "Nationalbanken", "købekraft", "pengepolitik"] },
  { id: "ma4", emne: "makro", tekst: "Hvad viser betalingsbalancen, og hvorfor er den vigtig for en åben økonomi som Danmarks?", stikord: ["betalingsbalance", "import", "eksport", "valutakurs", "åben økonomi"] },
  { id: "ma5", emne: "makro", tekst: "Forklar begrebet strukturel arbejdsløshed, og hvordan den adskiller sig fra konjunkturel arbejdsløshed.", stikord: ["strukturel", "konjunkturel", "arbejdsløshed", "mismatch", "kvalifikationer"] },

  { id: "mi1", emne: "mikro", tekst: "Forklar udbud- og efterspørgselskurven, og hvad der får dem til at forskyde sig.", stikord: ["udbud", "efterspørgsel", "ligevægtspris", "forskydning", "pris"] },
  { id: "mi2", emne: "mikro", tekst: "Hvad er priselasticitet, og hvorfor er den relevant for en virksomheds prissætning?", stikord: ["priselasticitet", "elastisk", "uelastisk", "prisfølsomhed", "omsætning"] },
  { id: "mi3", emne: "mikro", tekst: "Beskriv forskellen på fuldkommen konkurrence og monopol.", stikord: ["fuldkommen konkurrence", "monopol", "adgangsbarrierer", "prisfastsætter", "prismodtager"] },
  { id: "mi4", emne: "mikro", tekst: "Hvad forstås ved stordriftsfordele, og hvordan kan de påvirke en branches konkurrenceforhold?", stikord: ["stordriftsfordele", "enhedsomkostninger", "skala", "konkurrence"] },
  { id: "mi5", emne: "mikro", tekst: "Forklar begrebet eksternalitet med et selvvalgt eksempel.", stikord: ["eksternalitet", "positiv", "negativ", "samfundsøkonomisk", "eksempel"] },

  { id: "vi1", emne: "virksomhed", tekst: "Forklar forskellen på likviditet og rentabilitet, og hvorfor en virksomhed kan være rentabel uden at være likvid.", stikord: ["likviditet", "rentabilitet", "pengestrøm", "resultat", "betalingsevne"] },
  { id: "vi2", emne: "virksomhed", tekst: "Hvad er egenkapitalens forrentning, og hvad kan en høj eller lav værdi indikere?", stikord: ["egenkapital", "forrentning", "afkast", "gearing", "risiko"] },
  { id: "vi3", emne: "virksomhed", tekst: "Beskriv forskellen på fremmedkapital og egenkapital som finansieringskilder.", stikord: ["fremmedkapital", "egenkapital", "rente", "ejerskab", "risiko"] },
  { id: "vi4", emne: "virksomhed", tekst: "Hvad er en investerings tilbagebetalingstid, og hvilke svagheder har denne metode?", stikord: ["tilbagebetalingstid", "investering", "svagheder", "tidsværdi af penge"] },
  { id: "vi5", emne: "virksomhed", tekst: "Forklar begrebet dækningsbidrag, og hvordan det bruges til at vurdere et produkts lønsomhed.", stikord: ["dækningsbidrag", "variable omkostninger", "salgspris", "lønsomhed"] },

  { id: "ma_1", emne: "marketing", tekst: "Forklar de fire P'er i marketingmixet, og hvordan de spiller sammen.", stikord: ["produkt", "pris", "placering", "promotion", "sammenhæng"] },
  { id: "ma_2", emne: "marketing", tekst: "Hvad er segmentering, og hvilke kriterier kan en virksomhed segmentere sit marked efter?", stikord: ["segmentering", "demografi", "geografi", "adfærd", "målgruppe"] },
  { id: "ma_3", emne: "marketing", tekst: "Beskriv forskellen på en push- og en pull-strategi.", stikord: ["push", "pull", "distribution", "efterspørgsel", "reklame"] },
  { id: "ma_4", emne: "marketing", tekst: "Hvad forstås ved brandpositionering, og hvorfor er den vigtig?", stikord: ["positionering", "brand", "differentiering", "målgruppe", "konkurrenter"] },
  { id: "ma_5", emne: "marketing", tekst: "Forklar SWOT-analysen, og hvordan den kan bruges i en strategisk beslutning.", stikord: ["SWOT", "styrker", "svagheder", "muligheder", "trusler"] },

  { id: "or1", emne: "organisation", tekst: "Forklar forskellen på en funktionsopdelt og en divisionsopdelt organisationsstruktur.", stikord: ["funktionsopdelt", "divisionsopdelt", "struktur", "koordinering", "fordele"] },
  { id: "or2", emne: "organisation", tekst: "Hvad er situationsbestemt ledelse, og hvorfor kan det være hensigtsmæssigt at tilpasse sin ledelsesstil?", stikord: ["situationsbestemt ledelse", "medarbejderens modenhed", "ledelsesstil"] },
  { id: "or3", emne: "organisation", tekst: "Beskriv Kotters model for forandringsledelse med egne ord.", stikord: ["Kotter", "forandringsledelse", "trin", "modstand mod forandring"] },
  { id: "or4", emne: "organisation", tekst: "Hvad forstås ved organisationskultur, og hvordan kan den påvirke en virksomheds resultater?", stikord: ["organisationskultur", "værdier", "normer", "adfærd"] },
  { id: "or5", emne: "organisation", tekst: "Forklar forskellen på formel og uformel organisation.", stikord: ["formel organisation", "uformel organisation", "hierarki", "relationer"] },
];

/* --------------------------- HJÆLPEFUNKTIONER --------------------------- */

function tilfaeldigtSpoergsmaal(emneFilter) {
  const pulje = emneFilter === "alle" ? SPOERGSMAAL : SPOERGSMAAL.filter((s) => s.emne === emneFilter);
  return pulje[Math.floor(Math.random() * pulje.length)];
}

function formatTid(sek) {
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function callClaude(prompt, maxTokens) {
  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await res.json();
  return (d.content || []).filter((i) => i.type === "text").map((i) => i.text).join("\n").trim();
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/* --------------------------- COUNTDOWN HOOK --------------------------- */

function useCountdown(startSekunder, aktiv, onDone) {
  const [tilbage, setTilbage] = useState(startSekunder);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!aktiv) return;
    const slut = Date.now() + startSekunder * 1000;
    setTilbage(startSekunder);
    const id = setInterval(() => {
      const rest = Math.max(0, Math.round((slut - Date.now()) / 1000));
      setTilbage(rest);
      if (rest <= 0) {
        clearInterval(id);
        doneRef.current && doneRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [aktiv, startSekunder]);

  return tilbage;
}

/* --------------------------- FANE: OM --------------------------- */

function OmFane({ goTil }) {
  return (
    <div className="tl-fade">
      <p className="tl-lead" style={{ marginTop: 0 }}>
        Træn dine mundtlige eksamenssvar i erhvervsøkonomi. Du trækker et spørgsmål,
        forbereder dig i to minutter, og svarer derefter højt — enten ved at tale
        (talen omsættes automatisk til tekst) eller ved at skrive. Til sidst får du
        AI-feedback på fagligt indhold, struktur og mundtlig fremstilling.
      </p>
      <div className="tl-callout" style={{ marginBottom: 26 }}>
        <b>Sådan foregår det</b>
        <br />1. Vælg et emne (eller lad det være tilfældigt).
        <br />2. Forbered dig i 2 minutter — noter gerne stikord.
        <br />3. Svar mundtligt i op til 3 minutter.
        <br />4. Få konstruktiv AI-feedback og en vejledende besvarelse.
      </div>
      <p className="tl-eyebrow" style={{ marginBottom: 14 }}>Emner i spørgsmålsbanken</p>
      <div className="tl-grid tl-grid-2">
        {Object.entries(EMNER).map(([key, e], i) => {
          const antal = SPOERGSMAAL.filter((s) => s.emne === key).length;
          return (
            <div className="tl-gcard" key={key} style={{ animationDelay: `${i * 50}ms` }}>
              <h3>{e.navn}</h3>
              <p>{e.kort}</p>
              <span className="count">{antal} spørgsmål</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 30 }}>
        <button className="tl-btn accent" onClick={() => goTil("oev")}>Start træning</button>
      </div>
      <div className="tl-callout" style={{ marginTop: 30 }}>
        <b>Om lyd og privatliv</b>
        <br />Din stemme optages og genkendes lokalt af browseren (Web Speech API) —
        selve lyden sendes ikke til nogen server. Kun den tekst, du selv godkender i
        svar-feltet, sendes videre til AI-feedbacken, når du selv trykker på knappen.
      </div>
    </div>
  );
}

/* --------------------------- FANE: SPØRGSMÅLSBANK --------------------------- */

function BankFane() {
  const [filter, setFilter] = useState("alle");
  const [open, setOpen] = useState(null);
  const liste = filter === "alle" ? SPOERGSMAAL : SPOERGSMAAL.filter((s) => s.emne === filter);

  return (
    <div className="tl-fade">
      <div className="tl-chips">
        <button className={"tl-chip" + (filter === "alle" ? " active" : "")} onClick={() => setFilter("alle")}>Alle ({SPOERGSMAAL.length})</button>
        {Object.entries(EMNER).map(([key, e]) => (
          <button key={key} className={"tl-chip" + (filter === key ? " active" : "")} onClick={() => setFilter(key)}>{e.navn}</button>
        ))}
      </div>
      <div className="tl-grid">
        {liste.map((s, i) => {
          const isOpen = open === s.id;
          return (
            <div className={"tl-card" + (isOpen ? " open" : "")} key={s.id} style={{ animationDelay: `${i * 20}ms` }}>
              <div className="tl-card-head" onClick={() => setOpen(isOpen ? null : s.id)}>
                <span className="tl-tag">{EMNER[s.emne].navn}</span>
                <div><h4>{s.tekst}</h4></div>
                <span className="tl-plus">+</span>
              </div>
              {isOpen && (
                <div className="tl-body">
                  <div className="tl-row"><span className="lab">Stikord</span><span>{s.stikord.join(", ")}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- FANE: ØV DIG --------------------------- */

const FASE = { VAELG: "vaelg", FORBERED: "forbered", SVAR: "svar", FEEDBACK: "feedback" };
const FORBEREDELSE_SEK = 120;
const SVARTID_SEK = 180;

function OevFane() {
  const [emneFilter, setEmneFilter] = useState("alle");
  const [spoergsmaal, setSpoergsmaal] = useState(null);
  const [fase, setFase] = useState(FASE.VAELG);
  const [svarTekst, setSvarTekst] = useState("");
  const [noter, setNoter] = useState("");
  const [lytter, setLytter] = useState(false);
  const [taleFejl, setTaleFejl] = useState("");
  const [fb, setFb] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [fbErr, setFbErr] = useState("");
  const [model, setModel] = useState("");
  const [modelLoading, setModelLoading] = useState(false);
  const [modelErr, setModelErr] = useState("");
  const recognitionRef = useRef(null);
  const speechStoette = useMemo(() => !!getSpeechRecognition(), []);

  const nytSpoergsmaal = () => {
    setSpoergsmaal(tilfaeldigtSpoergsmaal(emneFilter));
    setSvarTekst("");
    setNoter("");
    setFb(""); setFbErr("");
    setModel(""); setModelErr("");
    setFase(FASE.FORBERED);
  };

  const forberedTid = useCountdown(FORBEREDELSE_SEK, fase === FASE.FORBERED, () => setFase(FASE.SVAR));
  const svarTid = useCountdown(SVARTID_SEK, fase === FASE.SVAR, () => stopLytning());

  function startLytning() {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "da-DK";
    rec.continuous = true;
    rec.interimResults = true;
    let endeligTekst = svarTekst ? svarTekst + " " : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) endeligTekst += t + " ";
        else interim += t;
      }
      setSvarTekst((endeligTekst + interim).trim());
    };
    rec.onerror = (e) => setTaleFejl("Talegenkendelse fejlede (" + e.error + "). Du kan skrive svaret i stedet.");
    rec.onend = () => setLytter(false);
    recognitionRef.current = rec;
    setTaleFejl("");
    rec.start();
    setLytter(true);
  }

  function stopLytning() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setLytter(false);
  }

  useEffect(() => () => stopLytning(), []);

  async function hentFeedback() {
    if (!svarTekst.trim()) { setFbErr("Skriv eller indtal et svar først."); return; }
    setFbLoading(true); setFbErr(""); setFb("");
    const prompt = `Du er en venlig, men fagligt grundig eksaminator til en mundtlig eksamen i erhvervsøkonomi på en dansk erhvervsakademiuddannelse.

Spørgsmål: "${spoergsmaal.tekst}"
Relevante stikord til et godt svar: ${spoergsmaal.stikord.join(", ")}.

Den studerendes mundtlige svar (transskriberet fra tale, kan indeholde småfejl fra tale-til-tekst):
"""
${svarTekst}
"""

Giv konstruktiv feedback på dansk i disse fire korte afsnit, hver indledt med sin overskrift på en linje for sig:
Fagligt indhold – er svaret korrekt og dækkende, og mangler der noget centralt?
Struktur og sammenhæng – er svaret bygget logisk op?
Mundtlig fremstilling – kommentér sprog, klarhed og eventuelle fyldord eller uklarheder i transskriptionen (vær mild, det er tale, ikke skrift).
Et konkret råd – én ting den studerende bør gøre for at forbedre svaret.

Vær opmuntrende, konkret og undgå at give en formel karakter. Skriv i ren tekst uden markdown-formatering (ingen stjerner eller havelåger).`;
    try {
      const txt = await callClaude(prompt, 900);
      if (txt) { setFb(txt); setFase(FASE.FEEDBACK); }
      else setFbErr("Der kom ikke noget svar. Prøv igen om et øjeblik.");
    } catch {
      setFbErr("Kunne ikke hente feedback lige nu. Prøv igen.");
    } finally {
      setFbLoading(false);
    }
  }

  async function hentModelsvar() {
    setModelLoading(true); setModelErr("");
    const prompt = `Giv et kort, vejledende mundtligt eksamenssvar på dansk til dette spørgsmål i erhvervsøkonomi, som en dygtig studerende ville formulere det (ca. 120-180 ord, tal-sprog, ikke akademisk skriftsprog):

Spørgsmål: "${spoergsmaal.tekst}"
Stikord der bør indgå: ${spoergsmaal.stikord.join(", ")}.

Skriv i ren tekst uden markdown-formatering (ingen stjerner eller havelåger).`;
    try {
      const txt = await callClaude(prompt, 500);
      if (txt) setModel(txt); else setModelErr("Kunne ikke hente en besvarelse. Prøv igen.");
    } catch {
      setModelErr("Kunne ikke hente en besvarelse. Prøv igen.");
    } finally {
      setModelLoading(false);
    }
  }

  if (fase === FASE.VAELG) {
    return (
      <div className="tl-fade">
        <div className="tl-panel">
          <p className="tl-sub">Vælg et emne, eller lad det være tilfældigt</p>
          <div className="tl-chips" style={{ justifyContent: "center", marginTop: 14 }}>
            <button className={"tl-chip" + (emneFilter === "alle" ? " active" : "")} onClick={() => setEmneFilter("alle")}>Alle emner</button>
            {Object.entries(EMNER).map(([key, e]) => (
              <button key={key} className={"tl-chip" + (emneFilter === key ? " active" : "")} onClick={() => setEmneFilter(key)}>{e.navn}</button>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <button className="tl-btn accent" onClick={nytSpoergsmaal}>Træk et spørgsmål</button>
          </div>
        </div>
      </div>
    );
  }

  if (!spoergsmaal) return null;

  if (fase === FASE.FORBERED) {
    return (
      <div className="tl-fade">
        <div className="tl-panel">
          <span className="tl-tag">{EMNER[spoergsmaal.emne].navn}</span>
          <p className="tl-prompt">{spoergsmaal.tekst}</p>
          <div className="tl-timer">{formatTid(forberedTid)}</div>
          <p className="tl-sub">Forberedelsestid — noter gerne stikord, du vil komme ind på.</p>
          <textarea className="tl-ta" value={noter} onChange={(e) => setNoter(e.target.value)} placeholder="Dine noter (valgfrit, deles ikke med AI'en)…" />
          <div className="tl-btnrow" style={{ justifyContent: "center" }}>
            <button className="tl-btn" onClick={() => setFase(FASE.SVAR)}>Spring forberedelse over</button>
          </div>
        </div>
      </div>
    );
  }

  if (fase === FASE.SVAR) {
    return (
      <div className="tl-fade">
        <div className="tl-panel">
          <span className="tl-tag">{EMNER[spoergsmaal.emne].navn}</span>
          <p className="tl-prompt">{spoergsmaal.tekst}</p>
          <div className="tl-timer">{formatTid(svarTid)}</div>
          <p className="tl-sub">Svar mundtligt, eller skriv dit svar herunder.</p>
          {noter.trim() && (
            <div className="tl-noter">
              <span className="lab">Dine noter</span>
              {noter}
            </div>
          )}
          {speechStoette ? (
            <div className="tl-btnrow" style={{ justifyContent: "center" }}>
              {!lytter ? (
                <button className="tl-btn accent" onClick={startLytning}><span className="tl-dot" /> Start optagelse</button>
              ) : (
                <button className="tl-btn sec" onClick={stopLytning}><span className="tl-dot rec" /> Stop optagelse</button>
              )}
            </div>
          ) : (
            <p className="tl-hint">Din browser understøtter ikke tale-til-tekst — skriv dit svar i feltet i stedet.</p>
          )}
          {taleFejl && <p className="tl-err">{taleFejl}</p>}
          <textarea className="tl-ta" style={{ marginTop: 14 }} value={svarTekst} onChange={(e) => setSvarTekst(e.target.value)} placeholder="Dit svar (tales ind automatisk, eller skriv selv)…" />
          <div className="tl-btnrow" style={{ justifyContent: "center" }}>
            <button className="tl-btn accent" disabled={fbLoading} onClick={() => { stopLytning(); hentFeedback(); }}>
              {fbLoading ? (<><span className="tl-spinner" />Henter feedback…</>) : "Afslut og få feedback"}
            </button>
          </div>
          {fbErr && <p className="tl-err">{fbErr}</p>}
        </div>
      </div>
    );
  }

  // FASE.FEEDBACK
  return (
    <div className="tl-fade">
      <div className="tl-panel" style={{ textAlign: "left" }}>
        <span className="tl-tag">{EMNER[spoergsmaal.emne].navn}</span>
        <p className="tl-prompt" style={{ textAlign: "left" }}>{spoergsmaal.tekst}</p>
        <p className="tl-eyebrow" style={{ marginTop: 18 }}>Dit svar</p>
        <div className="tl-svarbox">{svarTekst}</div>

        <div className="tl-fbbox">
          <h5>AI-feedback</h5>
          {fb}
        </div>

        {model ? (
          <div className="tl-modelbox">
            <h5>Vejledende besvarelse</h5>
            {model}
          </div>
        ) : (
          <div className="tl-btnrow">
            <button className="tl-btn sec sm" disabled={modelLoading} onClick={hentModelsvar}>
              {modelLoading ? (<><span className="tl-spinner dark" />Henter…</>) : "Se vejledende besvarelse"}
            </button>
          </div>
        )}
        {modelErr && <p className="tl-err">{modelErr}</p>}

        <div className="tl-btnrow" style={{ marginTop: 22 }}>
          <button className="tl-btn accent" onClick={nytSpoergsmaal}>Nyt spørgsmål</button>
          <button className="tl-btn sec" onClick={() => setFase(FASE.VAELG)}>Skift emne</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- STYLES (Dania Design Guide) --------------------------- */

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Hanken+Grotesk:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap');
    .tl-root {
      --cream: #F7F4EE; --neutral: #EDE8DE; --navy: #1C2B3A; --slate: #2D4257;
      --burgundy: #6B2737; --gold: #8B6914;
      --ok: #3B6D11; --ok-bg: #EAF3DE; --err: #993C1D; --err-bg: #FAECE7;
      --ink: #1C2B3A; --ink-soft: #2D4257; --line: rgba(28,43,58,0.14);
      font-family: 'Hanken Grotesk', sans-serif; color: var(--ink);
      background: var(--cream); min-height: 100vh; width: 100%; box-sizing: border-box;
    }
    .tl-root *, .tl-root *::before, .tl-root *::after { box-sizing: border-box; }
    .tl-wrap { max-width: 900px; margin: 0 auto; padding: 30px 22px 80px; }
    .tl-eyebrow { font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--slate); font-weight: 600; }
    .tl-h1 { font-family: 'Fraunces', serif; font-weight: 800; font-size: clamp(32px, 6.4vw, 52px); line-height: 1.04; margin: 10px 0 0; letter-spacing: -0.02em; color: var(--navy); }
    .tl-lead { color: var(--slate); font-size: clamp(15px, 2.4vw, 18px); max-width: 62ch; margin-top: 14px; line-height: 1.55; }
    .tl-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin: 28px 0 26px; border-bottom: 1.5px solid var(--line); }
    .tl-tab { border: none; background: none; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 15px; color: var(--slate); padding: 10px 13px; position: relative; transition: color .2s; }
    .tl-tab:hover { color: var(--navy); } .tl-tab.active { color: var(--navy); }
    .tl-tab.active::after { content: ''; position: absolute; left: 8px; right: 8px; bottom: -1.5px; height: 3px; background: var(--burgundy); border-radius: 3px 3px 0 0; }
    .tl-fade { animation: tlFade .4s ease both; }
    @keyframes tlFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .tl-grid { display: grid; gap: 14px; }
    @media (min-width: 640px) { .tl-grid-2 { grid-template-columns: 1fr 1fr; } }
    .tl-gcard { border: 1.5px solid var(--line); border-top: 3px solid var(--burgundy); border-radius: 10px; padding: 16px 18px; background: #fff; animation: tlFade .4s ease both; }
    .tl-gcard h3 { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 700; margin: 0 0 4px; color: var(--navy); }
    .tl-gcard p { margin: 6px 0 0; color: var(--slate); font-size: 13.5px; line-height: 1.5; }
    .tl-gcard .count { font-size: 12px; font-weight: 700; letter-spacing: .04em; margin-top: 10px; display: inline-block; color: var(--burgundy); }
    .tl-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; align-items: center; }
    .tl-chip { border: 1.5px solid var(--line); background: #fff; border-radius: 8px; padding: 7px 14px; cursor: pointer; font-weight: 600; font-size: 13px; color: var(--slate); transition: all .15s; font-family: inherit; }
    .tl-chip:hover { border-color: var(--navy); color: var(--navy); }
    .tl-chip.active { color: var(--cream); border-color: var(--burgundy); background: var(--burgundy); }
    .tl-card { border: 1.5px solid var(--line); border-top: 3px solid var(--burgundy); border-radius: 10px; background: #fff; overflow: hidden; transition: border-color .15s; animation: tlFade .4s ease both; }
    .tl-card:hover { border-color: var(--navy); border-top-color: var(--burgundy); }
    .tl-card-head { display: flex; align-items: center; gap: 13px; padding: 16px 18px; cursor: pointer; }
    .tl-tag { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--cream); background: var(--burgundy); padding: 4px 9px; border-radius: 5px; white-space: nowrap; flex-shrink: 0; }
    .tl-card-head h4 { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 700; margin: 0; line-height: 1.3; color: var(--navy); }
    .tl-plus { margin-left: auto; font-size: 22px; color: var(--slate); transition: transform .2s; flex-shrink: 0; }
    .tl-card.open .tl-plus { transform: rotate(45deg); }
    .tl-body { padding: 4px 18px 18px; }
    .tl-row { display: flex; gap: 10px; padding: 9px 0; border-top: 1px solid var(--line); font-size: 14px; line-height: 1.5; }
    .tl-row .lab { flex: 0 0 70px; font-weight: 700; color: var(--burgundy); font-size: 12px; letter-spacing: .03em; text-transform: uppercase; padding-top: 1px; }
    .tl-panel { border: 1.5px solid var(--line); border-top: 3px solid var(--burgundy); border-radius: 10px; background: #fff; padding: 30px 24px; text-align: center; }
    .tl-prompt { font-family: 'Fraunces', serif; font-size: clamp(20px, 4vw, 27px); font-weight: 700; margin: 10px 0 4px; line-height: 1.3; color: var(--navy); }
    .tl-sub { color: var(--slate); font-size: 14px; }
    .tl-timer { font-family: 'Spline Sans Mono', monospace; font-size: 40px; font-weight: 600; color: var(--burgundy); margin: 12px 0 4px; }
    .tl-btn { border: none; background: var(--navy); color: var(--cream); border-radius: 8px; padding: 12px 24px; font-weight: 700; font-size: 15px; cursor: pointer; font-family: inherit; transition: opacity .15s; display: inline-flex; align-items: center; gap: 8px; }
    .tl-btn:hover:not(:disabled) { opacity: .9; } .tl-btn:disabled { opacity: .55; cursor: default; }
    .tl-btn.accent { background: var(--burgundy); }
    .tl-btn.sec { background: none; color: var(--navy); border: 1.5px solid var(--navy); }
    .tl-btn.sm { padding: 9px 16px; font-size: 13.5px; }
    .tl-btnrow { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
    .tl-callout { border-left: 4px solid var(--gold); background: var(--neutral); border-radius: 0 8px 8px 0; padding: 14px 16px; margin-top: 16px; font-size: 14px; line-height: 1.55; color: var(--slate); text-align: left; }
    .tl-callout b { color: var(--navy); }
    .tl-footer { margin-top: 40px; padding-top: 18px; border-top: 1.5px solid var(--line); font-size: 12px; color: var(--slate); }
    .tl-ta { width: 100%; min-height: 110px; resize: vertical; border: 1.5px solid var(--line); border-radius: 8px; background: #fff; padding: 14px 15px; font-family: inherit; font-size: 15px; line-height: 1.55; color: var(--navy); outline: none; text-align: left; margin-top: 14px; }
    .tl-ta:focus { border-color: var(--navy); }
    .tl-noter { white-space: pre-wrap; text-align: left; background: var(--neutral); border-left: 4px solid var(--gold); border-radius: 0 8px 8px 0; padding: 12px 14px; margin-top: 14px; font-size: 14px; line-height: 1.55; color: var(--slate); }
    .tl-noter .lab { display: block; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: var(--burgundy); margin-bottom: 6px; }
    .tl-svarbox { white-space: pre-wrap; background: var(--neutral); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; font-size: 14px; line-height: 1.55; color: var(--ink); margin-bottom: 4px; }
    .tl-fbbox { background: #fff; border: 1.5px solid var(--line); border-left: 4px solid var(--navy); border-radius: 0 8px 8px 0; padding: 16px 18px; margin-top: 16px; white-space: pre-wrap; font-size: 14.5px; line-height: 1.6; color: var(--ink); }
    .tl-fbbox h5 { font-family: 'Fraunces', serif; font-size: 17px; margin: 0 0 8px; color: var(--navy); }
    .tl-modelbox { border: 1.5px solid var(--line); border-left: 4px solid var(--gold); border-radius: 0 8px 8px 0; background: var(--neutral); padding: 16px 18px; margin-top: 16px; font-size: 14.5px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; }
    .tl-modelbox h5 { font-family: 'Fraunces', serif; font-size: 17px; margin: 0 0 8px; color: var(--navy); }
    .tl-err { color: var(--err); font-weight: 600; font-size: 14px; margin-top: 12px; }
    .tl-hint { font-size: 13px; color: var(--slate); margin-top: 10px; }
    .tl-spinner { display: inline-block; width: 15px; height: 15px; border: 2.5px solid rgba(247,244,238,0.4); border-top-color: var(--cream); border-radius: 50%; animation: tlSpin .7s linear infinite; vertical-align: -2px; }
    .tl-spinner.dark { border-color: rgba(28,43,58,0.25); border-top-color: var(--navy); }
    @keyframes tlSpin { to { transform: rotate(360deg); } }
    .tl-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: var(--cream); }
    .tl-dot.rec { background: #fff; animation: tlPulse 1s ease-in-out infinite; }
    @keyframes tlPulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
  `}</style>
);

/* --------------------------- APP --------------------------- */

const FANER = [
  { key: "om", navn: "Om" },
  { key: "oev", navn: "Øv dig" },
  { key: "bank", navn: "Spørgsmålsbank" },
];

export default function App() {
  const [fane, setFane] = useState("om");

  return (
    <div className="tl-root">
      <Styles />
      <div className="tl-wrap">
        <p className="tl-eyebrow">Erhvervsakademi Dania · mundtlig eksamenstræning</p>
        <h1 className="tl-h1">Tale</h1>

        <div className="tl-tabs">
          {FANER.map((f) => (
            <button key={f.key} className={"tl-tab" + (fane === f.key ? " active" : "")} onClick={() => setFane(f.key)}>
              {f.navn}
            </button>
          ))}
        </div>

        {fane === "om" && <OmFane goTil={setFane} />}
        {fane === "oev" && <OevFane />}
        {fane === "bank" && <BankFane />}

        <div className="tl-footer">
          Feedback og vejledende besvarelser er udarbejdet med AI og er vejledende — brug dem som øvelse,
          ikke som facit. Erhvervsakademi Dania.
        </div>
      </div>
    </div>
  );
}
