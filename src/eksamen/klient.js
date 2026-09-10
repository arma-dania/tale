/**
 * Kald til serverfunktionerne.
 *
 * Eksaminationssvaret kommer som NDJSON, én hændelse per linje, så replikken
 * kan vises (og senere læses op) mens den bliver til.
 */

async function laesFilSomBase64(fil) {
  const buffer = await fil.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binaer = "";
  const stykke = 0x8000;
  for (let i = 0; i < bytes.length; i += stykke) {
    binaer += String.fromCharCode.apply(null, bytes.subarray(i, i + stykke));
  }
  return btoa(binaer);
}

export const MAKS_RAPPORT_BYTES = 4.5 * 1024 * 1024;

export async function uploadRapport(fil) {
  if (fil.size > MAKS_RAPPORT_BYTES) {
    throw new Error("Rapporten fylder for meget. Den må højst fylde 4,5 MB.");
  }
  const res = await fetch("/.netlify/functions/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64: await laesFilSomBase64(fil), filnavn: fil.name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      [data.error || "Rapporten kunne ikke lægges op.", data.detail].filter(Boolean).join(" ")
    );
  }
  return data.fileId;
}

export function sletRapport(fileId) {
  if (!fileId) return Promise.resolve();
  return fetch("/.netlify/functions/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handling: "slet", fileId }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Henter eksaminators næste replik.
 *
 * `paaTekst(samlet, stykke)` kaldes for hvert stykke tekst, efterhånden som
 * det kommer — `samlet` til skærmen, `stykke` til stemmen, der skal dele
 * replikken op i sætninger undervejs.
 * Returnerer bogføringen, når replikken er færdig.
 */
export async function hentReplik(payload, paaTekst) {
  const res = await fetch("/.netlify/functions/eksamen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let besked = "Eksaminator svarede ikke.";
    try {
      besked = (await res.json()).error || besked;
    } catch {
      // behold standardbeskeden
    }
    throw new Error(besked);
  }

  const laeser = res.body.getReader();
  const afkoder = new TextDecoder();
  let rest = "";
  let bogfoering = null;
  let tekst = "";

  const behandl = (linje) => {
    if (!linje.trim()) return;
    let h;
    try {
      h = JSON.parse(linje);
    } catch {
      return;
    }
    if (h.t === "tekst") {
      tekst += h.v;
      paaTekst?.(tekst, h.v);
    } else if (h.t === "bogfoer") {
      bogfoering = h.v;
    } else if (h.t === "fejl") {
      throw new Error(h.v);
    }
  };

  for (;;) {
    const { done, value } = await laeser.read();
    if (done) break;
    rest += afkoder.decode(value, { stream: true });
    const linjer = rest.split("\n");
    rest = linjer.pop() ?? "";
    linjer.forEach(behandl);
  }
  behandl(rest);

  if (!tekst.trim()) throw new Error("Eksaminator svarede ikke. Prøv igen.");
  return { tekst: tekst.trim(), bogfoering };
}
