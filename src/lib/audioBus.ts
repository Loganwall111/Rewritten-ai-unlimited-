/**
 * Central audio-analysis bus.
 *
 * Any part of the app can subscribe to a real-time "energy" value in [0,1]
 * that reflects the current output of the ambient loop and/or the user's
 * microphone.  Used by voice-reactive orbs, the mic page, etc.
 *
 * Implementation:
 *   • A shared AnalyserNode is created once, connected to the destination
 *     via a passthrough gain so we can tap into whatever's playing.
 *   • The ambient loop can register its final GainNode via `attachSource`
 *     to feed the analyser.
 *   • `startMicAnalysis()` optionally opens the user's microphone (with
 *     their permission) and feeds it in too.
 *
 * Energy = mean of low-band FFT bins, smoothed with EMA.
 */

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mixer: GainNode | null = null;
let micStream: MediaStream | null = null;
let micNode: MediaStreamAudioSourceNode | null = null;
let energy = 0;
let raf = 0;
let listeners = new Set<(e: number) => void>();

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function ensureAnalyser() {
  const c = ac();
  if (!c || analyser) return analyser;
  analyser = c.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;
  mixer = c.createGain();
  mixer.gain.value = 1;
  mixer.connect(analyser);
  startLoop();
  return analyser;
}

function startLoop() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  const tick = () => {
    if (!analyser) return;
    analyser.getByteFrequencyData(data);
    // low-band mean (first 32 bins ≈ up to ~4kHz on 44.1kHz)
    let sum = 0;
    const N = 32;
    for (let i = 0; i < N; i++) sum += data[i];
    const raw = sum / (N * 255);
    // EMA smoothing
    energy = energy * 0.85 + raw * 0.15;
    listeners.forEach((l) => l(energy));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

/** Attach an arbitrary GainNode (e.g. the ambient loop's final gain) to be
 *  analysed in addition to whatever else is feeding the mixer. */
export function attachSource(node: AudioNode) {
  ensureAnalyser();
  if (!mixer) return;
  try {
    node.connect(mixer);
  } catch {
    /* already connected */
  }
}

/** Opt-in microphone analysis. Returns true if granted. */
export async function startMicAnalysis(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const c = ac();
  if (!c) return false;
  ensureAnalyser();
  if (micStream) return true;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    micNode = c.createMediaStreamSource(micStream);
    if (mixer) micNode.connect(mixer);
    return true;
  } catch {
    return false;
  }
}

export function stopMicAnalysis() {
  if (micNode) {
    try {
      micNode.disconnect();
    } catch {
      /* noop */
    }
  }
  micNode = null;
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
  }
  micStream = null;
}

/** Subscribe to smoothed energy updates. Returns unsubscribe fn. */
export function subscribeEnergy(fn: (e: number) => void): () => void {
  ensureAnalyser();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function readEnergy(): number {
  return energy;
}

/** Cleanup for hot-reload. Rarely needed. */
export function disposeAudioBus() {
  cancelAnimationFrame(raf);
  listeners = new Set();
  stopMicAnalysis();
}
