import React from "react";

/** Dania-designlinjen: samme farver og skrifter som regnskabsanalyseværktøjet. */
export default function Styles() {
  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Hanken+Grotesk:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap');
    .tl-root {
      --cream: #F7F4EE; --neutral: #EDE8DE; --navy: #1C2B3A; --slate: #2D4257;
      --burgundy: #6B2737; --gold: #8B6914;
      --ok: #3B6D11; --ok-bg: #EAF3DE; --err: #993C1D; --err-bg: #FAECE7;
      --ink: #1C2B3A; --line: rgba(28,43,58,0.14);
      font-family: 'Hanken Grotesk', sans-serif; color: var(--ink);
      background: var(--cream); min-height: 100vh; width: 100%; box-sizing: border-box;
    }
    .tl-root *, .tl-root *::before, .tl-root *::after { box-sizing: border-box; }
    .tl-wrap { max-width: 800px; margin: 0 auto; padding: 30px 22px 70px; }
    .tl-eyebrow { font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: var(--slate); font-weight: 600; margin: 0; }
    .tl-h1 { font-family: 'Fraunces', serif; font-weight: 800; font-size: clamp(32px, 6vw, 50px); line-height: 1.04; margin: 10px 0 0; letter-spacing: -.02em; color: var(--navy); }
    .tl-undertitel { color: var(--slate); font-size: 16px; margin: 4px 0 26px; }
    .tl-lead { color: var(--slate); font-size: clamp(15px, 2.4vw, 17px); max-width: 62ch; line-height: 1.6; }
    .tl-fade { animation: tlFade .35s ease both; }
    @keyframes tlFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .tl-callout { border-left: 4px solid var(--gold); background: var(--neutral); border-radius: 0 8px 8px 0; padding: 14px 16px; margin-top: 16px; font-size: 14.5px; line-height: 1.6; color: var(--slate); }
    .tl-callout b { color: var(--navy); }
    .tl-btn { border: none; background: var(--navy); color: var(--cream); border-radius: 8px; padding: 12px 24px; font-weight: 700; font-size: 15px; cursor: pointer; font-family: inherit; transition: opacity .15s; display: inline-flex; align-items: center; gap: 8px; }
    .tl-btn:hover:not(:disabled) { opacity: .9; } .tl-btn:disabled { opacity: .5; cursor: default; }
    .tl-btn.accent { background: var(--burgundy); }
    .tl-btnrow { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
    .tl-hint { font-size: 13px; color: var(--slate); margin-top: 10px; line-height: 1.5; }
    .tl-err { color: var(--err); font-weight: 600; font-size: 14px; margin-top: 14px; }
    .tl-spinner { display: inline-block; width: 14px; height: 14px; border: 2.5px solid rgba(247,244,238,.4); border-top-color: var(--cream); border-radius: 50%; animation: tlSpin .7s linear infinite; }
    .tl-spinner.dark { border-color: rgba(28,43,58,.25); border-top-color: var(--navy); margin-right: 8px; vertical-align: -2px; }
    @keyframes tlSpin { to { transform: rotate(360deg); } }

    .tl-valg { display: grid; gap: 14px; margin-top: 12px; }
    @media (min-width: 640px) { .tl-valg { grid-template-columns: 1fr 1fr; } }
    .tl-kort { text-align: left; font-family: inherit; cursor: pointer; background: #fff; border: 1.5px solid var(--line); border-top: 3px solid var(--line); border-radius: 10px; padding: 16px 18px; transition: border-color .15s; }
    .tl-kort:hover { border-color: var(--navy); }
    .tl-kort.valgt { border-color: var(--burgundy); border-top-color: var(--burgundy); }
    .tl-kort h3 { font-family: 'Fraunces', serif; font-size: 19px; margin: 0 0 6px; color: var(--navy); }
    .tl-kort p { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--slate); }

    .tl-upload { margin-top: 20px; }
    .tl-filvalg { display: inline-flex; align-items: center; gap: 10px; border: 1.5px dashed var(--line); border-radius: 8px; padding: 14px 18px; cursor: pointer; background: #fff; font-weight: 600; font-size: 14.5px; color: var(--navy); }
    .tl-filvalg:hover { border-color: var(--navy); }
    .tl-filvalg input { display: none; }

    .tl-status { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; border-bottom: 1.5px solid var(--line); padding-bottom: 14px; margin-bottom: 18px; }
    .tl-ur { display: flex; align-items: baseline; gap: 7px; }
    .tl-ur .tid { font-family: 'Spline Sans Mono', monospace; font-size: 26px; font-weight: 600; color: var(--navy); }
    .tl-ur .tid.knap { color: var(--err); }
    .tl-ur .cap { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--slate); }
    .tl-emne { font-size: 13px; font-weight: 600; color: var(--slate); }

    .tl-samtale { display: flex; flex-direction: column; gap: 16px; min-height: 240px; max-height: 46vh; overflow-y: auto; padding-right: 4px; }
    .tl-tur .hvem { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: var(--slate); }
    .tl-tur.eksaminator .hvem { color: var(--burgundy); }
    .tl-tur p { margin: 4px 0 0; font-size: 15.5px; line-height: 1.6; white-space: pre-wrap; }
    .tl-tur.eksaminator p { font-family: 'Fraunces', serif; font-size: 18px; color: var(--navy); }
    .tl-tur.studerende p { color: var(--slate); border-left: 3px solid var(--line); padding-left: 12px; }
    .tl-taenker { color: var(--slate); font-style: italic; }

    .tl-svarfelt { display: flex; gap: 10px; align-items: flex-end; margin-top: 18px; }
    .tl-ta { flex: 1; min-height: 78px; resize: vertical; border: 1.5px solid var(--line); border-radius: 8px; background: #fff; padding: 12px 14px; font-family: inherit; font-size: 15px; line-height: 1.55; color: var(--navy); outline: none; }
    .tl-ta:focus { border-color: var(--navy); }

    .tl-delvis { color: var(--slate); font-style: italic; opacity: .75; }
    .tl-advarsel { color: var(--err); }

    .tl-mikrofon { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 18px; border-top: 1.5px solid var(--line); padding-top: 16px; }
    .tl-tilstand { font-size: 14.5px; font-weight: 600; color: var(--slate); flex: 1 1 auto; }
    .tl-lampe { width: 12px; height: 12px; border-radius: 50%; background: var(--neutral); border: 1.5px solid var(--line); flex-shrink: 0; }
    .tl-lampe.lytter { background: var(--ok); border-color: var(--ok); animation: tlPuls 1.4s ease-in-out infinite; }
    .tl-lampe.taler { background: var(--burgundy); border-color: var(--burgundy); }
    @keyframes tlPuls { 0%, 100% { box-shadow: 0 0 0 0 rgba(59,109,17,.45); } 60% { box-shadow: 0 0 0 7px rgba(59,109,17,0); } }
    .tl-link { background: none; border: none; color: var(--burgundy); font-weight: 700; cursor: pointer; font-size: 13px; padding: 0; text-decoration: underline; font-family: inherit; }

    .tl-panel { border: 1.5px solid var(--line); border-top: 3px solid var(--burgundy); border-radius: 10px; background: #fff; padding: 26px 22px; text-align: center; }
    .tl-prompt { font-family: 'Fraunces', serif; font-size: clamp(22px, 4vw, 30px); font-weight: 700; margin: 8px 0 6px; color: var(--navy); }
    .tl-sub { color: var(--slate); font-size: 14.5px; margin: 0; line-height: 1.55; }

    .tl-karakter { font-family: 'Fraunces', serif; font-weight: 800; font-size: 64px; line-height: 1; color: var(--burgundy); margin: 4px 0 8px; }

    .tl-vurdering { margin-top: 20px; border: 1.5px solid var(--line); border-left: 4px solid var(--navy); border-radius: 0 10px 10px 0; background: #fff; padding: 20px 22px; }
    .tl-vurdering h4 { font-family: 'Fraunces', serif; font-size: 16px; margin: 18px 0 6px; color: var(--navy); }
    .tl-vurdering p { margin: 0 0 6px; font-size: 15px; line-height: 1.65; color: var(--ink); }
    .tl-vurdering ul { margin: 0; padding-left: 20px; }
    .tl-vurdering li { font-size: 15px; line-height: 1.6; color: var(--ink); margin-bottom: 6px; }

    .tl-oversigt { margin-top: 20px; border: 1.5px solid var(--line); border-radius: 10px; overflow: hidden; background: #fff; }
    .tl-raekke { display: flex; justify-content: space-between; gap: 14px; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 14.5px; align-items: flex-start; }
    .tl-raekke:first-child { border-top: none; }
    .tl-raekke .indhold { display: flex; flex-direction: column; gap: 3px; }
    .tl-raekke .linje { font-size: 13.5px; line-height: 1.55; color: var(--slate); }
    .tl-raekke .navn { color: var(--navy); font-weight: 600; }
    .tl-raekke .mrk { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--slate); white-space: nowrap; }
    .tl-raekke.daekket .mrk { color: var(--ok); }
    .tl-raekke.delvist .mrk { color: var(--gold); }

    .tl-notater { margin-top: 22px; border-left: 4px solid var(--navy); background: #fff; border-radius: 0 8px 8px 0; padding: 16px 18px; }
    .tl-notater h4 { font-family: 'Fraunces', serif; font-size: 17px; margin: 0 0 10px; color: var(--navy); }
    .tl-notater p { margin: 0 0 8px; font-size: 14.5px; line-height: 1.6; color: var(--slate); }
    .tl-notater b { color: var(--navy); }

    .tl-footer { margin-top: 40px; padding-top: 18px; border-top: 1.5px solid var(--line); font-size: 12px; color: var(--slate); line-height: 1.6; }
  `}</style>
  );
}
