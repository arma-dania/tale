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
 * Kalder en af de streamede funktioner og kører `paaHaendelse` for hver linje.
 * En fejl-hændelse fra serveren kastes videre som en almindelig fejl.
 */
async function streamKald(sti, payload, standardfejl, paaHaendelse) {
  const res = await fetch(sti, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Serveren svarer med JSON, når den selv opdager fejlen. Er svaret noget
    // andet — typisk Netlifys egen fejlside, fordi funktionen løb tør for tid
    // — så sig i det mindste hvilken fejl det var.
    let besked = `${standardfejl} (serverfejl ${res.status})`;
    try {
      const data = await res.json();
      if (data.error) besked = [data.error, data.detail].filter(Boolean).join(" ");
    } catch {
      // behold statuskoden
    }
    throw new Error(besked);
  }

  const laeser = res.body.getReader();
  const afkoder = new TextDecoder();
  let rest = "";

  const behandl = (linje) => {
    if (!linje.trim()) return;
    let h;
    try {
      h = JSON.parse(linje);
    } catch {
      return;
    }
    if (h.t === "fejl") throw new Error(h.v);
    paaHaendelse(h);
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
  let tekst = "";
  let bogfoering = null;

  await streamKald("/.netlify/functions/eksamen", payload, "Eksaminator svarede ikke.", (h) => {
    if (h.t === "tekst") {
      tekst += h.v;
      paaTekst?.(tekst, h.v);
    } else if (h.t === "bogfoer") {
      bogfoering = h.v;
    }
  });

  if (!tekst.trim()) throw new Error("Eksaminator svarede ikke. Prøv igen.");
  return { tekst: tekst.trim(), bogfoering };
}

/**
 * Henter den afsluttende vurdering. Kaldet svarer til voteringen og tager tid,
 * så serveren sender livstegn undervejs — `paaSekunder` får dem, så skærmen
 * kan vise, at der stadig arbejdes.
 */
export async function hentVurdering(payload, paaSekunder) {
  let vurdering = null;

  await streamKald(
    "/.netlify/functions/vurdering",
    payload,
    "Vurderingen kunne ikke skrives.",
    (h) => {
      if (h.t === "vurdering") vurdering = h.v;
      else if (h.t === "arbejder") paaSekunder?.(h.v);
    }
  );

  if (!vurdering) {
    throw new Error("Voteringen nåede ikke at blive færdig. Prøv igen — samtalen er her stadig.");
  }
  return vurdering;
}
