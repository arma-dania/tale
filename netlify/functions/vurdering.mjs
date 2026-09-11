/**
 * Voteringen: skriver den afsluttende vurdering af den mundtlige præstation.
 *
 * Kaldet svarer til de fem minutters votering, den rigtige prøve afsætter,
 * og kører derfor på den kraftigste model — her vejer kvaliteten tungere end
 * svartiden. Svaret streames, fordi en streamet Netlify-funktion har tres
 * sekunder mod ti.
 *
 * Karakteren dækker alene den mundtlige præstation. Studieordningens karakter
 * er en helhedsbedømmelse af projekt og mundtlig prøve under ét, og det kan
 * dette værktøj ikke gøre — derfor står forbeholdet også i rapporten.
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import { BLOKKE, findBlok } from "../../src/eksamen/blokke.js";

const VURDERINGS_MODEL = "claude-opus-5";

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

const VURDER_VAERKTOEJ = {
  name: "vurder",
  description: "Aflever den samlede vurdering af den mundtlige præstation.",
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
      omraader: {
        type: "array",
        description: "Én linje per område, i samme rækkefølge som eksaminationen forløb.",
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
    required: ["karakter", "hovedindtryk", "begrundelse", "styrker", "forbedringer", "omraader"],
    additionalProperties: false,
  },
  strict: true,
};

function systemBlokke() {
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
${samtale}

Skriv nu vurderingen ved at kalde værktøjet vurder.`;
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

  let system;
  try {
    system = systemBlokke();
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
          model: VURDERINGS_MODEL,
          max_tokens: 3000,
          thinking: { type: "adaptive" },
          // Mellem effort frem for høj: vurderingen skal være grundig, men den
          // skal også nå at blive skrevet inden for funktionens tidsrum.
          output_config: { effort: "medium" },
          system,
          tools: [VURDER_VAERKTOEJ],
          messages: [{ role: "user", content: grundlag(body) }],
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
