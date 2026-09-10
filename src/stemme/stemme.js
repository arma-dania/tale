/**
 * Stemmelaget: mikrofon ind, eksaminators stemme ud.
 *
 * Lyden går direkte mellem browseren og Azure — vores egen server ser den
 * aldrig og udsteder kun det kortlivede token, browseren logger på med.
 *
 * Turtagningen er den svære del. Der er ingen knap at holde nede: værktøjet
 * lytter, indtil den studerende har været tavs et stykke tid, og opfatter det
 * som slutningen på svaret. Mens eksaminator taler, er mikrofonen slukket —
 * ellers hører den sig selv.
 */

/**
 * Azures tale-SDK fylder en halv megabyte og skal først bruges, når eksamen
 * går i gang — derfor hentes den først dér, og forsiden er let at loade.
 */
let SDK = null;
async function sdk() {
  if (!SDK) SDK = await import("microsoft-cognitiveservices-speech-sdk");
  return SDK;
}

/** Tavshed inde i et svar, før Azure klipper et segment af. */
const SEGMENT_STILHED_MS = 1500;
/** Tavshed efter sidste segment, før vi regner svaret for slut. */
export const SVAR_SLUT_STILHED_MS = 2500;
/** Tokenet holder ti minutter; vi forny det i god tid. */
const FORNY_MS = 8 * 60 * 1000;

export async function hentToken() {
  const res = await fetch("/.netlify/functions/stemme", { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error([data.error || "Stemmen kunne ikke startes.", data.detail].filter(Boolean).join(" "));
  }
  return data;
}

/** Beder om adgang til mikrofonen, mens brugeren stadig trykker på en knap. */
export async function bedOmMikrofon() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((spor) => spor.stop());
}

export class Stemme {
  constructor({ token, region, stemme }) {
    this.region = region;
    this.stemmeNavn = stemme;
    this.token = token;
    this.taler = null;
    this.lytter = null;
    this.fornyer = null;
    this.lukket = false;
  }

  static async opret() {
    await sdk();
    const { token, region, stemme } = await hentToken();
    const s = new Stemme({ token, region, stemme });
    s.fornyer = setInterval(() => s.fornyToken(), FORNY_MS);
    return s;
  }

  async fornyToken() {
    try {
      const { token } = await hentToken();
      this.token = token;
      if (this.taler) this.taler.authorizationToken = token;
      if (this.lytter) this.lytter.authorizationToken = token;
    } catch {
      // Det gamle token holder lidt endnu; næste forsøg kommer.
    }
  }

  konfiguration() {
    const cfg = SDK.SpeechConfig.fromAuthorizationToken(this.token, this.region);
    cfg.speechRecognitionLanguage = "da-DK";
    cfg.speechSynthesisVoiceName = this.stemmeNavn;
    return cfg;
  }

  /** Læser en sætning op. Løftet indfries, når den er læst færdig. */
  sig(tekst) {
    if (this.lukket || !tekst.trim()) return Promise.resolve();

    if (!this.taler) {
      this.taler = new SDK.SpeechSynthesizer(
        this.konfiguration(),
        SDK.AudioConfig.fromDefaultSpeakerOutput()
      );
    }

    return new Promise((færdig, fejl) => {
      this.taler.speakTextAsync(
        tekst,
        (resultat) => {
          if (resultat.reason === SDK.ResultReason.SynthesizingAudioCompleted) færdig();
          else fejl(new Error(resultat.errorDetails || "Stemmen kunne ikke læse op."));
        },
        (besked) => fejl(new Error(besked))
      );
    });
  }

  /**
   * Åbner mikrofonen.
   * @param {object} kald
   * @param {(tekst: string) => void} kald.paaDelvist  det, der høres lige nu
   * @param {(tekst: string) => void} kald.paaSegment  en færdig sætning fra den studerende
   * @param {(besked: string) => void} [kald.paaFejl]
   */
  async lyt({ paaDelvist, paaSegment, paaFejl }) {
    if (this.lukket) return;

    const cfg = this.konfiguration();
    cfg.setProperty(SDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, String(SEGMENT_STILHED_MS));

    this.lytter = new SDK.SpeechRecognizer(cfg, SDK.AudioConfig.fromDefaultMicrophoneInput());

    this.lytter.recognizing = (_, e) => {
      if (e.result?.text) paaDelvist?.(e.result.text);
    };
    this.lytter.recognized = (_, e) => {
      if (e.result?.reason === SDK.ResultReason.RecognizedSpeech && e.result.text.trim()) {
        paaSegment(e.result.text.trim());
      }
    };
    this.lytter.canceled = (_, e) => {
      if (e.reason === SDK.CancellationReason.Error) {
        paaFejl?.(e.errorDetails || "Mikrofonen mistede forbindelsen.");
      }
    };

    await new Promise((ok, fejl) =>
      this.lytter.startContinuousRecognitionAsync(ok, (b) => fejl(new Error(b)))
    );
  }

  /** Lukker mikrofonen. */
  async stopLyt() {
    const lytter = this.lytter;
    this.lytter = null;
    if (!lytter) return;
    await new Promise((ok) => lytter.stopContinuousRecognitionAsync(ok, ok));
    lytter.close();
  }

  async luk() {
    this.lukket = true;
    if (this.fornyer) clearInterval(this.fornyer);
    await this.stopLyt().catch(() => {});
    if (this.taler) {
      this.taler.close();
      this.taler = null;
    }
  }
}
