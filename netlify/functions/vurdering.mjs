/**
 * Voteringen: skriver den afsluttende vurdering af den mundtlige præstation.
 *
 * Arbejdet er delt i to kald, som klienten sender af sted samtidig, fordi ét
 * samlet kald ikke nåede at blive færdigt inden for det tidsrum, en funktion
 * har. Delene er også forskellige af natur:
 *
 *   "hoved"    — karakteren, begrundelsen og de gode råd. Det er her, der skal
 *                dømmes, så den kører på den kraftigste model.
 *   "omraader" — én linje om hvert af de syv områder. Det er sammenfatning af
 *                noget, der allerede er bogført, og klares af den hurtige model.
 *
 * Karakteren dækker alene den mundtlige præstation. Studieordningens karakter
 * er en helhedsbedømmelse af projekt og mundtlig prøve under ét, og det kan
 * dette værktøj ikke gøre — derfor står forbeholdet også i rapporten.
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import { BLOKKE, findBlok } from "../../src/eksamen/blokke.js";

/** Dømmekraften. Effort holdes lavt, så voteringen når at blive færdig. */
const HOVED_MODEL = "claude-opus-5";
/** Sammenfatningen af de syv områder — mekanisk arbejde, hurtig model. */
const OMRAADE_MODEL = "claude-sonnet-5";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

function laesTekstfil(relativSti) {
  const kandidater = [
    new URL(`../../${relativSti}`, import.meta.url).pathname,
    path.resolve(process.cwd(), relativSti),
    path.resolve("/var/task", relativSti),
  ];
  for (const sti of kandidater) {
    try {
      return fs.readFileSync(sti, "utf8");
    } catch {
      // prøv næste
    }
  }
  throw new Error(
    `Kunne ikke finde ${relativSti}. Tjek at included_files i netlify.toml dækker src/pensum/.`
  );
}

let pensumCache = null;
function pensum() {
  if (!pensumCache) {
    pensumCache = {
      tema6: laesTekstfil("src/pensum/tema6.md"),
      laeringsmaal: laesTekstfil("src/pensum/laeringsmaal.md"),
    };
  }
  return pensumCache;
}

const KARAKTERSKALA = `7-TRINS-SKALAEN

12 — Den fremragende præstation, der demonstrerer udtømmende opfyldelse af fagets mål, med ingen eller få uvæsentlige mangler.
10 — Den fortrinlige præstation, der demonstrerer omfattende opfyldelse af fagets mål, med nogle mindre væsentlige mangler.
7 — Den gode præstation, der demonstrerer opfyldelse af fagets mål, med en del mangler.
4 — Den jævne præstation, der demonstrerer en mindre grad af opfyldelse af fagets mål, med adskillige væsentlige mangler.
02 — Den tilstrækkelige præstation, der demonstrerer den minimalt acceptable grad af opfyldelse af fagets mål.
00 — Den utilstrækkelige præstation, der ikke demonstrerer en acceptabel grad af opfyldelse af fagets mål.
-3 — Den helt uacceptable præstation.`;

const ROLLE = `Du skriver den afsluttende vurdering af en studerendes mundtlige præstation ved en træningseksamen i Tema 6, Internationalisering, på markedsføringsøkonomuddannelsen ved Erhvervsakademi Dania.

DIT GRUNDLAG
Du får hele samtalen, eksaminators løbende notater og en oversigt over, hvor langt den studerende nåede i de syv områder. Du bedømmer alene det, den studerende faktisk sagde.

SÅDAN BEDØMMER DU
Studieordningen vægter to ting ved den mundtlige prøve: evnen til at perspektivere fra det konkrete i analyserne, og indsigt i og vurdering af analyserne i den faglige dialog. Det betyder, at en studerende, der gengiver en model korrekt uden at kunne bruge den på sin egen case, ikke opfylder målene — og at en studerende, der kan forklare, hvorfor netop den analyse førte til netop den beslutning, vejer tungt.

Områder, den studerende ikke nåede, fordi tiden løb ud, tæller hverken for eller imod. Områder, hvor den studerende ikke kunne svare, tæller med som mangler.

Vær ærlig. En vurdering, der er venligere end præstationen, hjælper ingen til eksamen. Vær samtidig konkret: peg på, hvad der blev sagt, ikke på almindeligheder.

SÅDAN SKRIVER DU
Dansk, du-form, henvendt til den studerende. Hele sætninger i almindelig tekst — ingen punktopstillinger, ingen markdown, ingen overskrifter inde i teksten. Det bliver sat op som et dokument bagefter.

Du afleverer vurderingen ved at kalde værktøjet vurder. Skriv ikke andet — hele svaret ligger i værktøjskaldet.`;

const OMRAADE_ROLLE = `Du sammenfatter, hvordan hvert af syv områder blev besvaret ved en mundtlig træningseksamen i Tema 6, Internationalisering, på markedsføringsøkonomuddannelsen ved Erhvervsakademi Dania.

Du får samtalen, eksaminators løbende notater og en oversigt over, hvor langt den studerende nåede. Skriv én til to sætninger om hvert område: hvad den studerende viste, eller hvad der manglede. Nåede området ikke at blive berørt, siger du det kort.

Dansk, du-form, henvendt til den studerende. Almindelige sætninger uden punktopstillinger eller markdown. Du dømmer ikke og giver ingen karakter — det sker et andet sted.

Du afleverer ved at kalde værktøjet omraader. Skriv ikke andet.`;

const OMRAADE_VAERKTOEJ = {
  name: "omraader",
  description: "Aflever én linje om hvert af de syv områder.",
  input_schema: {
    type: "object",
    properties: {
      omraader: {
        type: "array",
        description: "Ét punkt per område, i eksaminationens rækkefølge.",
        items: {
          type: "object",
          properties: {
            blokId: { type: "string", description: "Områdets id." },
            vurdering: {
              type: "string",
              description: "Én til to sætninger om, hvordan området blev besvaret.",
            },
          },
          required: ["blokId", "vurdering"],
          additionalProperties: false,
        },
      },
    },
    required: ["omraader"],
    additionalProperties: false,
  },
  strict: true,
};

const VURDER_VAERKTOEJ = {
  name: "vurder",
  description: "Aflever karakteren og den samlede vurdering af den mundtlige præstation.",
  input_schema: {
    type: "object",
    properties: {
      karakter: {
        type: "string",
        enum: ["12", "10", "7", "4", "02", "00", "-3"],
        description: "Karakteren efter 7-trins-skalaen for den mundtlige præstation alene.",
      },
      hovedindtryk: {
        type: "string",
        description:
          "Tre til fem sætninger om præstationen som helhed: hvad den studerende viste, og hvor niveauet ligger.",
      },
      begrundelse: {
        type: "string",
        description:
          "To til fire sætninger, der forklarer netop denne karakter med skalaens ord — omfanget af målopfyldelse og manglernes vægt.",
      },
      styrker: {
        type: "array",
        items: { type: "string" },
        description: "To til fire konkrete ting, der sad godt. Hver som én hel sætning.",
      },
      forbedringer: {
        type: "array",
        items: { type: "string" },
        description:
          "To til fire konkrete ting, den studerende bør arbejde med inden eksamen. Hver som én hel sætning, formuleret som noget, man kan gå hjem og gøre.",
      },
    },
    required: ["karakter", "hovedindtryk", "begrundelse", "styrker", "forbedringer"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * Hoveddelen skal dømme og har brug for hele grundlaget. Områdedelen skal bare
 * sammenfatte, hvad der allerede står i notaterne, og klarer sig uden pensum —
 * det gør kaldet mærkbart hurtigere.
 */
function systemBlokke(del) {
  if (del === "omraader") return [{ type: "text", text: OMRAADE_ROLLE }];

  const p = pensum();
  return [
    { type: "text", text: ROLLE },
    { type: "text", text: KARAKTERSKALA },
    { type: "text", text: `PENSUMARK — DIT FAGLIGE GRUNDLAG\n\n${p.tema6}` },
    {
      type: "text",
      text: `LÆRINGSMÅL OG BEDØMMELSESGRUNDLAG\n\n${p.laeringsmaal}`,
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ];
}

function grundlag({ historik = [], daekning = {}, notater = [], tilstand }) {
  const samtale = historik
    .map((tur) => `${tur.rolle === "eksaminator" ? "EKSAMINATOR" : "STUDERENDE"}: ${tur.tekst}`)
    .join("\n\n");

  const status = BLOKKE.map((b, i) => {
    const d = daekning[b.id] || "ikke_beroert";
    const ord =
      d === "daekket" ? "dækket" : d === "delvist" ? "delvist belyst" : "ikke nået";
    return `${i + 1}. ${b.navn} (id: ${b.id}): ${ord}`;
  }).join("\n");

  const noter = notater.length
    ? notater.map((n) => `- ${findBlok(n.blokId)?.navn || n.blokId}: ${n.notat}`).join("\n")
    : "(ingen)";

  return `PRØVEFORM: ${
    tilstand === "med_rapport"
      ? "Eksamination med udgangspunkt i den studerendes afleverede projekt."
      : "Eksamination i modellerne uden afleveret projekt."
  }

SÅDAN NÅEDE DEN STUDERENDE RUNDT
${status}

EKSAMINATORS LØBENDE NOTATER
${noter}

HELE SAMTALEN
${samtale}`;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY er ikke sat i Netlify (Environment variables)." }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ugyldig JSON i request." }, 400);
  }

  if (!Array.isArray(body.historik) || body.historik.length === 0) {
    return json({ error: "Der er ingen samtale at vurdere." }, 400);
  }

  const del = body.del === "omraader" ? "omraader" : "hoved";
  const opsaetning =
    del === "omraader"
      ? {
          model: OMRAADE_MODEL,
          max_tokens: 1500,
          thinking: { type: "disabled" },
          output_config: { effort: "low" },
          vaerktoej: OMRAADE_VAERKTOEJ,
          opgave: "Skriv nu linjerne ved at kalde værktøjet omraader.",
        }
      : {
          model: HOVED_MODEL,
          max_tokens: 1500,
          thinking: { type: "adaptive" },
          // Lav effort: vurderingen skal nå at blive skrevet færdig, og
          // grundlaget er allerede skåret til i pensumark og notater.
          output_config: { effort: "low" },
          vaerktoej: VURDER_VAERKTOEJ,
          opgave: "Skriv nu vurderingen ved at kalde værktøjet vurder.",
        };

  let system;
  try {
    system = systemBlokke(del);
  } catch (e) {
    return json({ error: e.message }, 500);
  }

  const client = new Anthropic();
  const koder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (t, v) => controller.enqueue(koder.encode(JSON.stringify({ t, v }) + "\n"));

      // Voteringen tager tid, og en funktion, der intet sender, bliver lukket
      // ned undervejs. Et livstegn hvert andet sekund holder forbindelsen åben
      // og giver klienten noget at vise imens.
      send("arbejder", 0);
      const start = Date.now();
      const puls = setInterval(() => {
        try {
          send("arbejder", Math.round((Date.now() - start) / 1000));
        } catch {
          clearInterval(puls);
        }
      }, 2000);

      try {
        const svar = client.messages.stream({
          model: opsaetning.model,
          max_tokens: opsaetning.max_tokens,
          thinking: opsaetning.thinking,
          output_config: opsaetning.output_config,
          system,
          tools: [opsaetning.vaerktoej],
          messages: [{ role: "user", content: `${grundlag(body)}\n\n${opsaetning.opgave}` }],
        });

        const endelig = await svar.finalMessage();
        const kald = endelig.content.find((b) => b.type === "tool_use");
        if (!kald?.input) throw new Error("Der kom ingen vurdering tilbage.");
        send("vurdering", kald.input);
      } catch (e) {
        send("fejl", e?.message || String(e));
      } finally {
        clearInterval(puls);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
};
