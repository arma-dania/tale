# Tema 6 — mundtlig eksamenstræning

Værktøj til at træne den mundtlige prøve i Tema 6, Internationalisering, på
markedsføringsøkonomuddannelsen (AK) ved Erhvervsakademi Dania.

Den studerende bliver eksamineret i femten minutter — samme eksaminationstid som ved
den rigtige prøve — og føres igennem alle syv områder af pensum. Værktøjet kan køre
**med rapport**, hvor spørgsmålene forankres i gruppens afleverede projekt, og **uden
rapport**, hvor der eksamineres i modellerne selv.

## Status

Bygges i tre etaper. Etape 1 er færdig:

- [x] **Etape 1** — eksamensmotoren: PDF-rapporten læses, uret styrer tempoet gennem de
      syv blokke, eksaminator stiller spørgsmål og bogfører dækningen. Svar skrives
      indtil videre på tastatur.
- [ ] **Etape 2** — stemmelaget: den studerende taler, og værktøjet svarer mundtligt.
- [ ] **Etape 3** — den skriftlige vurdering som PDF med karakter.

## Sådan sættes det op

1. **Netlify**: Add new site → Import an existing project → vælg dette repository.
   Byggeindstillingerne læses fra `netlify.toml`.
2. **API-nøgle**: Site configuration → Environment variables → `ANTHROPIC_API_KEY` med
   nøglen fra console.anthropic.com. Derefter Deploys → Trigger deploy → Deploy site,
   da ændrede miljøvariabler først slår igennem ved en ny deploy.

Nøglen må aldrig i GitHub. `.env` er med i `.gitignore`.

## Sådan retter du i det faglige

Alt det, en underviser normalt vil ændre, ligger i almindelige tekstfiler — ingen
programmering nødvendig.

| Fil | Indhold |
|---|---|
| `src/pensum/tema6.md` | Pensumarket: eksaminators faglige facit. Punkter mærket **[TJEK]** er formuleringer, der varierer fra lærebog til lærebog og bør rettes til holdets materiale. |
| `src/pensum/laeringsmaal.md` | Læringsmål og bedømmelsesgrundlag fra studieordningen. |
| `src/eksamen/blokke.js` | De syv blokke, deres emner og fordelingen af de femten minutter. Summen af `minutter` bør give 15. |
| `netlify/functions/eksamen.mjs` | Eksaminatorens rolle og regler (`ROLLE`) samt modelvalget (`SAMTALE_MODEL`). |

## Sådan virker tempostyringen

Modellen bestemmer, hvad der spørges om, og om et svar er dækkende. **Koden** bestemmer,
hvornår en blok lukkes ned — ellers er der ingen garanti for, at den studerende når hele
vejen rundt. Løber en blok over tiden, fordeles den resterende tid på ny mellem de
blokke, der mangler, efter deres vægt. Logikken ligger i `src/eksamen/klokke.js` og er
dækket af tests:

```
npm test
```

## Data

Der er ingen database, og intet gemmes på serveren. Rapporten lægges op via Anthropics
Files API, så den ikke skal sendes igen ved hvert replikskifte, og slettes igen, når
eksamen er slut eller fanen lukkes. Som sikkerhedsnet ryddes filer ældre end to timer op,
hver gang en ny lægges op. Samtalen findes kun i browserens hukommelse.

De studerende oplyses på startskærmen om, at data behandles uden for EU.

## Kør lokalt

```
npm install
npm run dev
```

Selve brugerfladen virker med det samme. Skal eksaminator svare, kræver det Netlify CLI
(`npm i -g netlify-cli`) og `netlify dev`, så serverfunktionerne og miljøvariablen kører med.
