/**
 * Udsteder et kortlivet token til Azures taletjeneste.
 *
 * Abonnementsnøglen må ikke i browseren, så klienten får i stedet et token,
 * der udløber efter ti minutter. Browseren taler derefter direkte med Azure,
 * så lyden aldrig går gennem vores server.
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const noegle = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!noegle || !region) {
    return json(
      {
        error:
          "AZURE_SPEECH_KEY og AZURE_SPEECH_REGION er ikke sat i Netlify (Environment variables).",
      },
      500
    );
  }

  try {
    const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": noegle, "content-length": "0" },
    });

    if (!res.ok) {
      return json(
        { error: "Kunne ikke hente et stemmetoken fra Azure.", detail: `${res.status} ${await res.text()}` },
        502
      );
    }

    return json({
      token: await res.text(),
      region,
      stemme: process.env.AZURE_SPEECH_VOICE || "da-DK-ChristelNeural",
    });
  } catch (e) {
    return json({ error: "Kunne ikke nå Azure.", detail: e?.message || String(e) }, 502);
  }
};
