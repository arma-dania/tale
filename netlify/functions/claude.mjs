// Serverless-proxy: holder din Anthropic-nøgle hemmeligt på serveren.
// Klienten (App.jsx) kalder /.netlify/functions/claude med { model, max_tokens, messages }.
export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY er ikke sat i Netlify (Environment variables)." }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ugyldig JSON i request." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    // Send Anthropics svar (og evt. fejl) uændret videre til klienten.
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Kunne ikke nå Anthropic API.", detail: String(e) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
};
