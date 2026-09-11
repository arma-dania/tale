# Tema 6 — mundtlig eksamenstræning

Værktøj til at træne den mundtlige prøve i Tema 6, Internationalisering, på
markedsføringsøkonomuddannelsen (AK) ved Erhvervsakademi Dania.

Den studerende bliver eksamineret i femten minutter — samme eksaminationstid som ved
den rigtige prøve — og føres igennem alle syv områder af pensum. Værktøjet kan køre
**med rapport**, hvor spørgsmålene forankres i gruppens afleverede projekt, og **uden
rapport**, hvor der eksamineres i modellerne selv.

## Sådan hænger det sammen

Den studerende lægger sit projekt op som PDF, bliver eksamineret mundtligt i femten
minutter og henter til sidst en skriftlig vurdering med en vejledende karakter.

| Del | Hvor |
|---|---|
| Eksamensmotoren: rapporten læses, uret styrer tempoet gennem de syv blokke, eksaminator spørger og bogfører | `netlify/functions/eksamen.mjs`, `src/eksamen/` |
| Stemmelaget: den studerende taler, eksaminator svarer mundtligt | `netlify/functions/stemme.mjs`, `src/stemme/` |
| Voteringen og vurderingen som PDF | `netlify/functions/vurdering.mjs`, `src/vurdering/` |

Skrift bruges som reserve hele vejen, hvis mikrofon eller stemmetjeneste svigter.

## Sådan sættes det op

1. **Netlify**: Add new site → Import an existing project → vælg dette repository.
   Byggeindstillingerne læses fra `netlify.toml`.
2. **Miljøvariabler**: Site configuration → Environment variables. Derefter Deploys →
   Trigger deploy → Deploy site, da ændrede miljøvariabler først slår igennem ved en
   ny deploy.

| Variabel | Værdi | Påkrævet |
|---|---|---|
| `ANTHROPIC_API_KEY` | Nøglen fra console.anthropic.com | Ja |
| `AZURE_SPEECH_KEY` | Nøgle 1 fra Azure-taleressourcen | Til stemmen |
| `AZURE_SPEECH_REGION` | Ressourcens region, fx `westeurope` | Til stemmen |
| `AZURE_SPEECH_VOICE` | Stemmenavn, fx `da-DK-JeppeNeural` | Nej — Christel som standard |

Uden Azure-variablerne kører værktøjet videre i skriftlig form; det er også det, der
sker for en studerende, der ikke giver adgang til mikrofonen.

Nøglerne må aldrig i GitHub. `.env` er med i `.gitignore`. Azure-nøglen forlader aldrig
serveren: browseren får i stedet et token, der udløber efter ti minutter.

### Azure-taleressourcen

I portal.azure.com: Create a resource → Speech (Azure AI services). Vælg et europæisk
datacenter — ikke af juridiske grunde, men fordi kortere afstand giver kortere svartid.
Nøgle og region findes derefter under Keys and Endpoint.

## Sådan retter du i det faglige

Alt det, en underviser normalt vil ændre, ligger i almindelige tekstfiler — ingen
programmering nødvendig.

| Fil | Indhold |
|---|---|
| `src/pensum/tema6.md` | Pensumarket: eksaminators faglige facit. Punkter mærket **[TJEK]** er formuleringer, der varierer fra lærebog til lærebog og bør rettes til holdets materiale. |
| `src/pensum/laeringsmaal.md` | Læringsmål og bedømmelsesgrundlag fra studieordningen. |
| `src/eksamen/blokke.js` | De syv blokke, deres emner og fordelingen af de femten minutter. Summen af `minutter` bør give 15. |
| `netlify/functions/eksamen.mjs` | Eksaminatorens rolle og regler (`ROLLE`) samt modelvalget (`SAMTALE_MODEL`). |
| `netlify/functions/vurdering.mjs` | Hvordan der bedømmes (`ROLLE`) og karakterskalaens ordlyd (`KARAKTERSKALA`). |
| `src/stemme/stemme.js` | Turtagningen: hvor længe der må være stille, før et svar regnes for slut. |

## Sådan bedømmes der

Voteringen kører på den kraftigste model med hele samtalen, eksaminators løbende notater
og oversigten over, hvor langt den studerende nåede. Karakteren sættes efter
7-trins-skalaens egne formuleringer om graden af målopfyldelse, og studieordningens to
krav til den mundtlige prøve vejer tungest: at kunne perspektivere fra det konkrete i
analyserne, og at vise indsigt i og vurdering af analyserne i dialogen. Områder, der ikke
blev nået, fordi tiden løb ud, tæller hverken for eller imod; områder, hvor den
studerende ikke kunne svare, tæller som mangler.

Karakteren dækker **alene den mundtlige præstation**. Studieordningens karakter er en
helhedsbedømmelse af projekt og mundtlig prøve under ét, inklusive formalia og
kildehenvisninger, og det kan værktøjet ikke gøre. Forbeholdet står både på skærmen og i
PDF'en.

PDF'en dannes i browseren med jsPDF og sendes ingen steder hen. Lukker den studerende
fanen uden at hente den, er vurderingen væk — det er prisen for, at intet gemmes.

## Sådan virker turtagningen

Der er ingen knap at holde nede. Mikrofonen er slukket, mens eksaminator taler — ellers
hører den sig selv — og åbnes, når replikken er læst færdig. Derefter lyttes der, indtil
den studerende har været tavs i to et halvt sekund, og så sendes svaret. Siger den
studerende slet ingenting i tyve sekunder, går eksaminator videre af sig selv, som en
rigtig eksaminator ville. Knappen "Færdig med svaret" er nødudgangen, hvis pauserne
bliver for lange.

Replikken læses op sætning for sætning, mens den skrives, så stemmen begynder efter et
par hundrede millisekunder i stedet for at vente på hele svaret. Opdelingen ligger i
`src/stemme/saetninger.js` og passer på danske forkortelser og tal, så der ikke klippes
midt i "bl.a." eller "1.500".

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
