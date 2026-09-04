# Tale – mundtlig eksamenstræning

Interaktivt værktøj, hvor studerende kan træne mundtlige eksamenssvar i
erhvervsøkonomi. Den studerende trækker et spørgsmål, får to minutters
forberedelse og svarer derefter højt — talen omsættes til tekst i browseren —
og får til sidst AI-feedback på fagligt indhold, struktur og mundtlig
fremstilling samt en vejledende besvarelse.

AI-funktionerne kaldes gennem en Netlify-funktion, så din Anthropic-nøgle
holdes hemmelig på serveren, og de studerende **ikke** skal logge ind nogen
steder.

## Sådan sætter du det op

### 1. Kobl Netlify til repoet
1. Log ind på netlify.com → **Add new site → Import an existing project**.
2. Vælg GitHub og dette repository.
3. Byggeindstillingerne læses automatisk fra `netlify.toml`
   (build-kommando `npm run build`, publish-mappe `dist`,
   funktioner i `netlify/functions`). Tryk **Deploy**.

### 2. Læg din API-nøgle ind
1. I Netlify: **Site configuration → Environment variables → Add a variable**.
2. Key: `ANTHROPIC_API_KEY` — Value: din nøgle fra console.anthropic.com.
3. Gå til **Deploys → Trigger deploy → Deploy site** (ændringer i
   miljøvariabler kræver en ny deploy for at slå igennem).

Færdig. Dit offentlige link står øverst i Netlify.

## Godt at vide
- **Nøglen må aldrig i GitHub.** Den ligger kun som miljøvariabel i Netlify.
  `.env` er med i `.gitignore`.
- **Lyd forlader ikke browseren.** Talegenkendelsen sker med browserens
  indbyggede Web Speech API. Kun den tekst, den studerende selv godkender i
  svarfeltet, sendes videre — og først når der trykkes på feedback-knappen.
- **Browserunderstøttelse.** Tale-til-tekst virker i Chrome, Edge og Safari.
  I Firefox skjules optageknappen, og svaret skrives i stedet.
- **Forbrug koster.** Hvert AI-kald (feedback, vejledende besvarelse) trækker
  på dit Anthropic-forbrug. Spørgsmålsbanken og selve træningsforløbet er
  gratis og kræver ingen nøgle.
- **Skift model:** i `src/App.jsx`, funktionen `callClaude`, står
  `model: "claude-sonnet-4-6"`.

## Tilføj eller ret spørgsmål
Spørgsmålene ligger i `src/App.jsx` i arrayet `SPOERGSMAAL`. Hvert spørgsmål
har et `emne` (nøgle fra `EMNER`), selve `tekst`en og en liste af `stikord`,
som AI'en bruger, når den vurderer, om svaret er dækkende. Emnerne kan ændres
i objektet `EMNER` lige ovenfor.

## Kør lokalt (valgfrit)
```
npm install
npm run dev
```
Selve træningsforløbet virker med det samme. Skal AI-funktionerne også virke
lokalt, kræver det Netlify CLI (`npm i -g netlify-cli`) og `netlify dev`, så
funktionen og miljøvariablen kører med.
