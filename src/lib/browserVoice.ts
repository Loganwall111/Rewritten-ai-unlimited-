/**
 * Browser SpeechSynthesis fallback — but a GOOD one.
 *
 * The default `speechSynthesis.speak()` picks whatever voice the OS returns
 * first — usually a low-quality legacy voice ("Alex", "Microsoft David
 * Desktop", etc.). Modern operating systems ship with much better neural /
 * cloud voices (Google UK Female, Samantha, Microsoft Aria Online) — we
 * just have to look for them by name.
 *
 * This module:
 *   • loads the voice list (which is populated asynchronously)
 *   • ranks all voices and returns the best available match for a given
 *     "flavor" (warm-female / narrator-male / etc.)
 *   • exposes speak() with intelligent voice selection + prosody defaults
 *   • never plays the awful default robot on modern browsers if a neural
 *     voice exists
 */

let voicesCache: SpeechSynthesisVoice[] = [];
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

/** Load the SpeechSynthesis voice list, waiting for the async populate. */
export function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const tryList = () => {
      const list = speechSynthesis.getVoices();
      if (list && list.length > 0) {
        voicesCache = list;
        resolve(list);
        return true;
      }
      return false;
    };
    if (tryList()) return;
    // Browsers dispatch voiceschanged when the list is ready
    const on = () => {
      if (tryList()) {
        speechSynthesis.removeEventListener("voiceschanged", on);
      }
    };
    speechSynthesis.addEventListener("voiceschanged", on);
    // Safety timeout — resolve with whatever we have after 1.5s
    setTimeout(() => {
      tryList();
      resolve(voicesCache);
    }, 1500);
  });
  return voicesReady;
}

/**
 * Best-effort ranking. Higher score = more likely to sound human.
 * We prefer:
 *   • "Neural", "Online", "Enhanced", "Premium" in the name
 *   • Named Google/Microsoft/Apple cloud voices we know are good
 *   • non-Legacy, non-Compact variants
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/(neural|online|enhanced|premium|natural|cloud)/.test(n)) s += 100;
  // Known-good named cloud voices
  const goodNames = [
    "aria",
    "guy",
    "jenny",
    "michelle",
    "monica", // MS Azure Neural
    "samantha",
    "karen",
    "moira",
    "tessa",
    "veena", // Apple
    "google uk english female",
    "google uk english male",
    "google us english",
    "google united kingdom",
    "google australian",
    "google english",
  ];
  if (goodNames.some((g) => n.includes(g))) s += 60;
  // Penalize bad legacy voices
  if (/(compact|legacy|espeak|festival)/.test(n)) s -= 80;
  if (n === "microsoft david desktop") s -= 60;
  if (n === "microsoft zira desktop") s -= 40;
  if (n === "microsoft mark desktop") s -= 60;
  // English preferred, but not required
  if (v.lang.startsWith("en")) s += 20;
  // Default flag as a mild tiebreaker
  if (v.default) s += 3;
  // "localService=false" often means a cloud voice → usually higher quality
  if (v.localService === false) s += 25;
  return s;
}

export type VoiceFlavor = "warm-female" | "narrator-male" | "any";

function flavorMatch(v: SpeechSynthesisVoice, flavor: VoiceFlavor): number {
  if (flavor === "any") return 0;
  const n = v.name.toLowerCase();
  const female =
    /(aria|jenny|samantha|karen|moira|tessa|veena|monica|zira|female|woman|shimmer|nova|sarah|laura|matilda)/;
  const male = /(guy|alex|david|mark|onyx|echo|fable|brian|atlas|charlie|callum|male|man)/;
  if (flavor === "warm-female" && female.test(n)) return 40;
  if (flavor === "narrator-male" && male.test(n)) return 40;
  return 0;
}

/**
 * Pick the best voice for a given flavor. Falls back to the highest-scoring
 * available voice if no flavor match exists.
 */
export async function pickBestBrowserVoice(
  flavor: VoiceFlavor = "warm-female",
): Promise<SpeechSynthesisVoice | null> {
  const list = await loadBrowserVoices();
  if (!list.length) return null;
  const ranked = [...list]
    .map((v) => ({ v, s: scoreVoice(v) + flavorMatch(v, flavor) }))
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.v ?? null;
}

/**
 * Speak text via SpeechSynthesis using the best available voice.
 * Returns a Promise that resolves when speech ends (or errors).
 */
export async function speakWithBestBrowserVoice(
  text: string,
  flavor: VoiceFlavor = "warm-female",
): Promise<{ ok: boolean; voice?: string }> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { ok: false };
  }
  const t = text.trim();
  if (!t) return { ok: false };
  try {
    speechSynthesis.cancel();
  } catch {
    /* noop */
  }
  const voice = await pickBestBrowserVoice(flavor);
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(t);
    if (voice) u.voice = voice;
    // Nicer prosody than the browser defaults
    u.rate = 0.98;
    u.pitch = 1.03;
    u.volume = 1;
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ ok, voice: voice?.name });
    };
    u.onend = () => settle(true);
    u.onerror = () => settle(false);
    try {
      speechSynthesis.speak(u);
    } catch {
      settle(false);
    }
    // Safety: some browsers never fire onend for long text — resolve based
    // on estimated duration (~14 chars/sec).
    const est = Math.max(1500, Math.min(15000, t.length * 70));
    setTimeout(() => settle(true), est + 800);
  });
}

/**
 * Warm-up: call once early (e.g. on first user gesture) so the voice list
 * is loaded before we need it, and so mobile Safari primes the audio context.
 */
export function warmUpBrowserVoices() {
  void loadBrowserVoices();
}

/** Human-readable label of the currently-preferred voice (for HUDs). */
export async function describeBestBrowserVoice(
  flavor: VoiceFlavor = "warm-female",
): Promise<string | null> {
  const v = await pickBestBrowserVoice(flavor);
  return v ? `${v.name} (${v.lang})` : null;
}
