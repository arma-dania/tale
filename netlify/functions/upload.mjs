/**
 * Modtager den studerendes rapport som PDF og lægger den op via Anthropics
 * Files API, så den kan sendes med i eksaminationen uden at blive uploadet
 * igen ved hvert replikskifte.
 *
 * Rapporten gemmes ikke af os. Filen ligger hos Anthropic, indtil klienten
 * beder om at få den slettet ved eksamenens afslutning — og som sikkerhedsnet
 * ryddes alt op, der er ældre end to timer, hver gang nogen lægger en ny op.
 */

import Anthropic, { toFile } from "@anthropic-ai/sdk";

const MAKS_BYTES = 4.5 * 1024 * 1024;
const OPRYDNING_MS = 2 * 60 * 60 * 1000;

/**
 * Files API ligger under client.beta i denne SDK-version. SDK'et sætter selv
 * beta-headeren på beta.files-kaldene; den angives kun eksplicit ved upload,
 * hvor den også skal følge med multipart-kaldet.
 */
const FILES_BETA = ["files-api-2025-04-14"];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

async function ryddeGamleFiler(client) {
  try {
    const graense = Date.now() - OPRYDNING_MS;
    const liste = await client.beta.files.list({ limit: 100 });
    for (const fil of liste.data || []) {
      if (new Date(fil.created_at).getTime() < graense) {
        await client.beta.files.delete(fil.id).catch(() => {});
      }
    }
  } catch {
    // Oprydning må aldrig vælte en upload.
  }
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

  const client = new Anthropic();

  if (body.handling === "slet") {
    if (!body.fileId) return json({ error: "fileId mangler." }, 400);
    try {
      await client.beta.files.delete(body.fileId);
      return json({ slettet: true });
    } catch (e) {
      return json({ error: "Kunne ikke slette filen.", detail: e?.message || String(e) }, 502);
    }
  }

  if (!body.pdfBase64) return json({ error: "pdfBase64 mangler." }, 400);

  let bytes;
  try {
    bytes = Buffer.from(body.pdfBase64, "base64");
  } catch {
    return json({ error: "Rapporten kunne ikke afkodes." }, 400);
  }
  if (bytes.length === 0) return json({ error: "Rapporten er tom." }, 400);
  if (bytes.length > MAKS_BYTES) {
    return json({ error: "Rapporten er for stor. Den må højst fylde 4,5 MB." }, 413);
  }
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return json({ error: "Filen ser ikke ud til at være en PDF." }, 400);
  }

  try {
    const fil = await client.beta.files.upload({
      file: await toFile(bytes, body.filnavn || "rapport.pdf", { type: "application/pdf" }),
      betas: FILES_BETA,
    });
    ryddeGamleFiler(client);
    return json({ fileId: fil.id, bytes: bytes.length });
  } catch (e) {
    return json({ error: "Rapporten kunne ikke lægges op.", detail: e?.message || String(e) }, 502);
  }
};
