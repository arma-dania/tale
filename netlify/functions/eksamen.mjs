/**
 * Eksaminator-motoren.
 *
 * Funktionen er statsløs: klienten holder samtalen og uret og sender det hele
 * med hver gang. Der gemmes intet på serveren, og der findes ingen database.
 *
 * Svaret streames linje for linje som NDJSON:
 *   {"t":"tekst","v":"..."}     løbende stykker af eksaminators replik
 *   {"t":"bogfoer","v":{...}}   modellens bogføring af blokken, til sidst
 *   {"t":"fejl","v":"..."}      hvis noget gik galt undervejs
 *
 * Streaming er ikke pynt: Netlify giver en streamet funktion 60 sekunder mod
 * 10 for en almindelig, og det første kald skal nå at læse hele rapporten.
 * Samtidig kan stemmelaget begynde at læse op på første sætning.
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import { BLOKKE, findBlok } from "../../src/eksamen/blokke.js";

/**
 * Modelvalg. Samtalen kører på den hurtige model, fordi hvert sekunds
 * forsinkelse mærkes i en mundtlig eksamen. Skift her, hvis det skal ændres.
 */
const SAMTALE_MODEL = "claude-sonnet-5";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

/* --------------------------- pensum fra disk --------------------------- */

// Filerne følger med funktionen via `included_files` i netlify.toml.
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

/* --------------------------- prompt --------------------------- */

const ROLLE = `Du er eksaminator ved en mundtlig prøve på Erhvervsakademi Dania, uddannelsen til markedsføringsøkonom (AK). Det er 2. interne prøve i Tema 6, Internationalisering. Eksaminationen varer 15 minutter, og den studerende skal nå igennem alle syv blokke.

SÅDAN TALER DU
Dansk, du-form, roligt og venligt, men fagligt fast. Ét spørgsmål ad gangen, højst 40 ord. Din replik bliver læst højt, så skriv rent talesprog: ingen punktopstillinger, overskrifter, parenteser, tal i parentes eller markdown. Efter det første spørgsmål dropper du høflighedsfraser — kvittér kort og stil næste spørgsmål.

SÅDAN EKSAMINERER DU
Du retter aldrig den studerende og giver aldrig feedback undervejs. Også når svaret er direkte forkert, kvitterer du neutralt og går videre. Vurderingen kommer først efter eksamen, og den studerende må ikke kunne aflæse den på dig.

Er svaret dækkende, borer du dybere i samme blok, så længe der er tid: hvorfor blev det valgt, hvad ville ændre konklusionen, hvordan hænger det sammen med et andet valg i planen.

Er svaret tomt, forkert eller helt ved siden af, stiller du ét hjælpespørgsmål, der åbner emnet på en lettere måde. Hjælper det heller ikke, går du videre uden at kommentere det. Du bliver aldrig hængende i en model, den studerende ikke kan.

Du vægter, om den studerende kan ANVENDE modellerne på sin egen case og perspektivere fra det konkrete — ikke om modellerne kan remses op. Et korrekt refereret teoriafsnit uden anvendelse er ikke et godt svar.

STYRING
Sidst i hvert af den studerendes svar står en linje mærket STYRING med den aktuelle blok, hvor lang tid der er tilbage, og om du skal skifte blok. Den følger du ubetinget. Står der, at du skal skifte, indleder du næste blok med det samme, uanset hvor interessant det forrige emne var. Står der, at tiden er ved at være brugt, runder du af med en kort, neutral afslutning uden vurdering.

STYRING-linjen er systemets besked til dig, ikke noget den studerende har sagt. Nævn den aldrig, og læs den aldrig op.

BOGFØRING
Umiddelbart efter hver replik kalder du værktøjet bogfoer. Først replikken som almindelig tekst, så værktøjskaldet.`;

const BOGFOER_VAERKTOEJ = {
  name: "bogfoer",
  description:
    "Bogfør, hvordan den aktuelle blok står efter den studerendes seneste svar. Kaldes én gang efter hver replik.",
  input_schema: {
    type: "object",
    properties: {
      blokStatus: {
        type: "string",
        enum: ["ikke_beroert", "delvist", "daekket"],
        description:
          "Hvor godt blokken samlet er belyst indtil nu: ikke_beroert hvis intet brugbart er sagt, delvist hvis noget sidder men væsentligt mangler, daekket hvis den studerende har vist forståelse for både model og anvendelse.",
      },
      gaaVidere: {
        type: "boolean",
        description:
          "true hvis du er færdig med blokken og lige har indledt den næste, eller er klar til det. false hvis du bliver i blokken.",
      },
      varHjaelpespoergsmaal: {
        type: "boolean",
        description:
          "true hvis replikken var det ene tilladte hjælpespørgsmål, fordi svaret var tomt eller helt ved siden af.",
      },
      afslut: {
        type: "boolean",
        description: "true hvis replikken var den afsluttende afrunding af eksamen.",
      },
      notat: {
        type: "string",
        description:
          "Ét til to sætninger på dansk til brug i den afsluttende vurdering: hvad den studerende konkret viste eller manglede i dette svar. Sagligt og konkret, uden ros eller løftede pegefingre.",
      },
    },
    required: ["blokStatus", "gaaVidere", "varHjaelpespoergsmaal", "afslut", "notat"],
    additionalProperties: false,
  },
  strict: true,
};

function blokOversigt() {
  return BLOKKE.map((b, i) => {
    const emner = b.emner.map((e) => `   - ${e}`).join("\n");
    return `${i + 1}. ${b.navn} (id: ${b.id}, cirka ${b.minutter} minutter)\n${emner}`;
  }).join("\n\n");
}

function systemBlokke() {
  const p = pensum();
  return [
    { type: "text", text: ROLLE },
    {
      type: "text",
      text: `EKSAMINATIONENS SYV BLOKKE OG DERES EMNER\n\n${blokOversigt()}`,
    },
    { type: "text", text: `PENSUMARK — DIT FAGLIGE GRUNDLAG\n\n${p.tema6}` },
    {
      type: "text",
      text: `LÆRINGSMÅL OG BEDØMMELSESGRUNDLAG\n\n${p.laeringsmaal}`,
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ];
}

function aabningsBesked(tilstand, fileId) {
  const indhold = [];
  if (tilstand === "med_rapport" && fileId) {
    indhold.push({
      type: "document",
      source: { type: "file", file_id: fileId },
      title: "Den studerendes projekt",
    });
    indhold.push({
      type: "text",
      text: "Ovenfor er den studerendes afleverede projekt. Eksaminationen tager udgangspunkt i det: spørg til de konkrete valg, tal og formuleringer, der står i rapporten, og bed den studerende begrunde dem. Du eksaminerer både i modellerne selv og i anvendelsen af dem i projektet.",
      cache_control: { type: "ephemeral", ttl: "1h" },
    });
  } else {
    indhold.push({
      type: "text",
      text: "Der er ikke afleveret noget projekt. Du eksaminerer i modellerne selv og beder undervejs den studerende give egne eksempler på, hvordan de ville bruges i praksis.",
      cache_control: { type: "ephemeral", ttl: "1h" },
    });
  }
  return { role: "user", content: indhold };
}

function styringslinje(styring) {
  const blok = findBlok(styring.blokId);
  const dele = [
    `aktuel blok: ${blok ? blok.navn : styring.blokId}`,
    `tid tilbage af eksamen: ${Math.round(styring.tilbage / 60)} min ${styring.tilbage % 60} sek`,
    `tid tilbage i denne blok: ${styring.blokTilbage} sek`,
  ];
  if (styring.hjaelpBrugt) dele.push("hjælpespørgsmålet i denne blok er brugt — gå videre frem for at hjælpe igen");
  if (styring.skalSkifte) dele.push("SKIFT TIL NÆSTE BLOK NU");
  if (styring.afrunding) dele.push("tiden er ved at være brugt — rund af");
  if (styring.tidenErBrugt) dele.push("TIDEN ER GÅET — afslut eksamen med det samme");
  return `\n\n[STYRING: ${dele.join("; ")}]`;
}

function byggBeskeder({ tilstand, fileId, historik = [], styring, start }) {
  const beskeder = [aabningsBesked(tilstand, fileId)];

  if (start) {
    const blok = findBlok(styring.blokId);
    beskeder.push({
      role: "user",
      content:
        `Eksaminationen begynder nu. Byd kort velkommen med én sætning og stil dit første spørgsmål inden for blokken "${blok?.navn}".` +
        styringslinje(styring),
    });
    return beskeder;
  }

  historik.forEach((tur, i) => {
    const sidste = i === historik.length - 1;
    if (tur.rolle === "eksaminator") {
      beskeder.push({ role: "assistant", content: tur.tekst });
    } else {
      const tekst = tur.tekst.trim() || "(den studerende siger ikke noget)";
      beskeder.push({ role: "user", content: sidste ? tekst + styringslinje(styring) : tekst });
    }
  });

  return beskeder;
}

/* --------------------------- streaming --------------------------- */

function streamSvar(client, beskeder) {
  const koder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (t, v) => controller.enqueue(koder.encode(JSON.stringify({ t, v }) + "\n"));
      try {
        const stream = client.messages.stream({
          model: SAMTALE_MODEL,
          max_tokens: 700,
          // Tænkning slået fra: i en mundtlig eksamen vejer svartiden tungere
          // end den ekstra eftertanke. Sæt til {type:"adaptive"} for det modsatte.
          thinking: { type: "disabled" },
          output_config: { effort: "low" },
          system: systemBlokke(),
          tools: [BOGFOER_VAERKTOEJ],
          messages: beskeder,
        });

        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            send("tekst", ev.delta.text);
          }
        }

        const endelig = await stream.finalMessage();
        const kald = endelig.content.find((b) => b.type === "tool_use");
        send("bogfoer", kald ? kald.input : null);
      } catch (e) {
        send("fejl", e?.message || String(e));
      } finally {
        controller.close();
      }
    },
  });
}

/* --------------------------- indgang --------------------------- */

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

  const { handling, tilstand, fileId, historik, styring } = body;
  if (handling !== "start" && handling !== "tur") {
    return json({ error: "Ukendt handling." }, 400);
  }
  if (!styring || !styring.blokId) {
    return json({ error: "styring mangler." }, 400);
  }
  if (tilstand === "med_rapport" && !fileId) {
    return json({ error: "Der mangler en rapport." }, 400);
  }

  let beskeder;
  try {
    beskeder = byggBeskeder({
      tilstand,
      fileId,
      historik,
      styring,
      start: handling === "start",
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }

  const client = new Anthropic();
  return new Response(streamSvar(client, beskeder), {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
