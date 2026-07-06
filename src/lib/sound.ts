// Web Audio SFX system ported from base44.
let ctx: AudioContext | null = null;
let enabled = true;
const STORAGE_KEY = "rewritten_sound_enabled";

if (typeof window !== "undefined") {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved !== null) enabled = saved === "1";
}

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

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    window.dispatchEvent(new Event("sound-toggle"));
  }
  // Also duck / unduck the ambient loop if it's running
  const c = ac();
  if (amb && c) {
    amb.gain.gain.linearRampToValueAtTime(v ? ambVolume : 0, c.currentTime + 0.25);
  }
}
export function isSoundEnabled() {
  return enabled;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.08) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {
    /* noop */
  }
}

export const playClick = () => tone(800, 0.05, "square", 0.04);
export const playHover = () => tone(1200, 0.02, "sine", 0.02);
export const playSend = () => tone(600, 0.08, "sine", 0.05);
export const playError = () => tone(200, 0.2, "sawtooth", 0.05);
export const playSuccess = () => {
  tone(523, 0.08, "sine", 0.06);
  setTimeout(() => tone(659, 0.08, "sine", 0.06), 70);
  setTimeout(() => tone(784, 0.12, "sine", 0.06), 140);
};
export const playBoot = () => {
  tone(330, 0.1, "sine", 0.06);
  setTimeout(() => tone(440, 0.1, "sine", 0.06), 100);
  setTimeout(() => tone(554, 0.1, "sine", 0.06), 200);
  setTimeout(() => tone(659, 0.2, "sine", 0.06), 300);
};

export const playWormhole = () => {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = "sawtooth";
    o.frequency.setValueAtTime(80, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 2.2);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2.4);
    o.start();
    o.stop(c.currentTime + 2.5);
  } catch {
    /* noop */
  }
};

export const playWhale = (panFromTo?: { from: number; to: number }) => {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(200, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, c.currentTime + 1.6);
    o.frequency.exponentialRampToValueAtTime(240, c.currentTime + 2.8);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 3.2);
    // Optional stereo pan — screen X normalized to [-1, 1]. Great for
    // flyby-style whale calls in the background scene.
    let last: AudioNode = g;
    // StereoPannerNode is supported on all modern browsers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CC = c as any;
    if (typeof CC.createStereoPanner === "function") {
      const pan = CC.createStereoPanner();
      const from = Math.max(-1, Math.min(1, panFromTo?.from ?? 0));
      const to = Math.max(-1, Math.min(1, panFromTo?.to ?? from));
      pan.pan.setValueAtTime(from, c.currentTime);
      pan.pan.linearRampToValueAtTime(to, c.currentTime + 2.8);
      g.connect(pan);
      last = pan;
    }
    o.connect(g);
    last.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 3.3);
  } catch {
    /* noop */
  }
};

export const playVortex = () => {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    o.connect(f);
    f.connect(g);
    g.connect(c.destination);
    o.type = "sawtooth";
    f.type = "bandpass";
    f.frequency.value = 220;
    f.Q.value = 6;
    o.frequency.setValueAtTime(120, c.currentTime);
    o.frequency.linearRampToValueAtTime(300, c.currentTime + 1.5);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.4);
    g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.6);
    o.start();
    o.stop(c.currentTime + 1.7);
  } catch {
    /* noop */
  }
};

/* ─────────── Ambient underwater + cosmic drone loop ─────────── */
type Ambient = {
  osc: OscillatorNode[];
  lfo: OscillatorNode[];
  gain: GainNode;
  filter: BiquadFilterNode;
  reverb: ConvolverNode | null;
  noise: AudioBufferSourceNode | null;
  playing: boolean;
};

let amb: Ambient | null = null;
let ambVolume = 0.25;

/** Generate a simple impulse response so the drone feels vast. */
function makeReverbIR(c: AudioContext, seconds = 3): AudioBuffer {
  const rate = c.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = c.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
  }
  return buf;
}

/** Very quiet pink-ish noise for the "dark sparkling sea" hiss. */
function makeNoiseBuffer(c: AudioContext, seconds = 4): AudioBuffer {
  const rate = c.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = c.createBuffer(1, len, rate);
  const d = buf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    d[i] = (b0 + b1 + b2 + white * 0.1848) * 0.03;
  }
  return buf;
}

/**
 * Starts a low ambient drone: two detuned sine pads (underwater) + one high
 * cosmic shimmer, all routed through a low-pass filter + convolution reverb
 * + pink noise for the "dark sea" hiss.  Idempotent — safe to call twice.
 */
export function startAmbient() {
  const c = ac();
  if (!c) return;
  if (amb?.playing) return;

  const gain = c.createGain();
  gain.gain.value = enabled ? ambVolume : 0;

  // Low-pass filter that slowly opens & closes — feels like "waves" moving over you
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;

  // Filter-sweep LFO
  const lfoF = c.createOscillator();
  const lfoFGain = c.createGain();
  lfoF.frequency.value = 0.04;
  lfoFGain.gain.value = 400;
  lfoF.connect(lfoFGain).connect(filter.frequency);

  // Reverb tail
  let reverb: ConvolverNode | null = null;
  try {
    reverb = c.createConvolver();
    reverb.buffer = makeReverbIR(c, 3.5);
  } catch {
    reverb = null;
  }

  // Base pad — two detuned sines an octave apart
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  const o3 = c.createOscillator();
  o1.type = "sine";
  o1.frequency.value = 55; // A1 — deep sub
  o2.type = "sine";
  o2.frequency.value = 55.4; // slight detune for chorus
  o3.type = "sine";
  o3.frequency.value = 110; // A2

  // Cosmic shimmer — high triangle that occasionally rings
  const shim = c.createOscillator();
  shim.type = "triangle";
  shim.frequency.value = 660;
  const shimGain = c.createGain();
  shimGain.gain.value = 0;
  // Modulate shimmer volume slowly so it fades in & out like distant chimes
  const shimLFO = c.createOscillator();
  const shimLFOGain = c.createGain();
  shimLFO.frequency.value = 0.11;
  shimLFOGain.gain.value = 0.008;
  shimLFO.connect(shimLFOGain).connect(shimGain.gain);

  // Pink noise
  const noiseBuf = makeNoiseBuffer(c, 5);
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseGain = c.createGain();
  noiseGain.gain.value = 0.15;

  const padGain = c.createGain();
  padGain.gain.value = 0.35;

  // Wire it up: pads → padGain → filter → reverb → out
  o1.connect(padGain);
  o2.connect(padGain);
  o3.connect(padGain);
  shim.connect(shimGain).connect(padGain);
  noise.connect(noiseGain).connect(padGain);
  padGain.connect(filter);
  if (reverb) {
    // parallel dry/wet
    filter.connect(reverb);
    reverb.connect(gain);
    filter.connect(gain);
  } else {
    filter.connect(gain);
  }
  gain.connect(c.destination);

  o1.start();
  o2.start();
  o3.start();
  shim.start();
  lfoF.start();
  shimLFO.start();
  noise.start();

  // Feed the ambient loop into the shared audio-analyser bus so orbs / HUD
  // can react to its energy in real time. Lazy-import to avoid circular init.
  import("./audioBus").then(({ attachSource }) => attachSource(gain)).catch(() => {});

  amb = {
    osc: [o1, o2, o3, shim],
    lfo: [lfoF, shimLFO],
    gain,
    filter,
    reverb,
    noise,
    playing: true,
  };
}

export function stopAmbient() {
  if (!amb) return;
  const c = ac();
  if (!c) return;
  try {
    amb.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
    setTimeout(() => {
      amb?.osc.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* noop */
        }
      });
      amb?.lfo.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* noop */
        }
      });
      try {
        amb?.noise?.stop();
      } catch {
        /* noop */
      }
      amb = null;
    }, 500);
  } catch {
    /* noop */
  }
}

export function isAmbientPlaying() {
  return Boolean(amb?.playing);
}

export function setAmbientVolume(v: number) {
  ambVolume = Math.max(0, Math.min(1, v));
  const c = ac();
  if (amb && c) amb.gain.gain.linearRampToValueAtTime(enabled ? ambVolume : 0, c.currentTime + 0.2);
}

/**
 * Rich ripple sound — soft filtered impulse + a tiny high-frequency sparkle.
 * Called on click alongside the visual ripple.
 */
export function playRipple(x = 0.5) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    // Water-drop: quick pitch-drop sine
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1400;
    o.type = "sine";
    const base = 900 + x * 400;
    o.frequency.setValueAtTime(base, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(base * 0.35, c.currentTime + 0.18);
    g.gain.setValueAtTime(0.001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
    o.connect(g).connect(f).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.4);

    // Sparkle: fast triangle chirp
    const s = c.createOscillator();
    const sg = c.createGain();
    s.type = "triangle";
    s.frequency.setValueAtTime(3200, c.currentTime);
    s.frequency.exponentialRampToValueAtTime(4600, c.currentTime + 0.08);
    sg.gain.setValueAtTime(0.0001, c.currentTime);
    sg.gain.exponentialRampToValueAtTime(0.02, c.currentTime + 0.005);
    sg.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
    s.connect(sg).connect(c.destination);
    s.start();
    s.stop(c.currentTime + 0.13);
  } catch {
    /* noop */
  }
}

/**
 * Deep sub-bass "whoomph" — plays when the camera crosses the event horizon
 * on the multiverse page. A sine wave that starts at 40Hz, sweeps up to 90Hz
 * then down to 25Hz over ~1.4s with heavy reverb tail.
 */
export function playHorizonWhoomph() {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const now = c.currentTime;
    // Fundamental sub-bass
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(40, now);
    o.frequency.exponentialRampToValueAtTime(90, now + 0.35);
    o.frequency.exponentialRampToValueAtTime(25, now + 1.4);
    // Punchy envelope
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    // Low-pass to remove any harshness
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    lp.Q.value = 1.2;
    o.connect(g).connect(lp).connect(c.destination);
    o.start(now);
    o.stop(now + 1.6);

    // Overlaid noise burst for "air"
    const bufLen = Math.floor(c.sampleRate * 0.9);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const ng = c.createGain();
    ng.gain.value = 0.08;
    const nlp = c.createBiquadFilter();
    nlp.type = "lowpass";
    nlp.frequency.value = 400;
    src.connect(ng).connect(nlp).connect(c.destination);
    src.start(now);
  } catch {
    /* noop */
  }
}

/**
 * Meteor / whoosh — for empty-space click meteor shower inside the horizon.
 * Fast filtered noise burst with a slight pitch drop.
 */
export function playMeteor(pan = 0) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const now = c.currentTime;
    const bufLen = Math.floor(c.sampleRate * 0.45);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      d[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(2400, now);
    bp.frequency.exponentialRampToValueAtTime(700, now + 0.45);
    bp.Q.value = 2.5;
    let last: AudioNode = bp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CC = c as any;
    if (typeof CC.createStereoPanner === "function") {
      const p = CC.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      bp.connect(p);
      last = p;
    }
    src.connect(g).connect(bp);
    last.connect(c.destination);
    src.start(now);
  } catch {
    /* noop */
  }
}

/* ─────────── Master bus + rich SFX library (new) ─────────── */

let masterOut: GainNode | null = null;
let masterReverb: ConvolverNode | null = null;
let masterComp: DynamicsCompressorNode | null = null;

/**
 * Build a shared master output chain the first time it's needed:
 *   source → dry → compressor → destination
 *                ↘ wet → reverb → compressor
 * All fresh SFX route through `getMasterOut()` for cohesion + safety limiting.
 */
function getMasterOut(): GainNode | null {
  const c = ac();
  if (!c) return null;
  if (masterOut) return masterOut;
  masterOut = c.createGain();
  masterOut.gain.value = 1;
  masterComp = c.createDynamicsCompressor();
  masterComp.threshold.value = -14;
  masterComp.knee.value = 12;
  masterComp.ratio.value = 4;
  masterComp.attack.value = 0.006;
  masterComp.release.value = 0.18;
  // Small reverb bus for atmospheric wetness
  try {
    masterReverb = c.createConvolver();
    const len = Math.floor(c.sampleRate * 1.6);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    masterReverb.buffer = buf;
  } catch {
    masterReverb = null;
  }
  const wet = c.createGain();
  wet.gain.value = 0.25;
  const dry = c.createGain();
  dry.gain.value = 1;
  masterOut.connect(dry).connect(masterComp);
  if (masterReverb) {
    masterOut.connect(wet).connect(masterReverb).connect(masterComp);
  }
  masterComp.connect(c.destination);
  return masterOut;
}

/** Helper: create + start an oscillator, envelope-controlled by a gain. */
function osc(
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  dur: number,
  peakGain: number,
  pan = 0,
  filterHz?: number,
) {
  if (!enabled) return;
  const c = ac();
  const out = getMasterOut();
  if (!c || !out) return;
  try {
    const now = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart)
      o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peakGain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    let last: AudioNode = g;
    if (filterHz) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filterHz;
      g.connect(f);
      last = f;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CC = c as any;
    if (typeof CC.createStereoPanner === "function") {
      const p = CC.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      last.connect(p);
      last = p;
    }
    o.connect(g);
    last.connect(out);
    o.start(now);
    o.stop(now + dur + 0.05);
  } catch {
    /* noop */
  }
}

/** Short filtered noise burst — for taps, taps, air whooshes. */
function noise(dur: number, peak: number, hzStart: number, hzEnd: number, pan = 0) {
  if (!enabled) return;
  const c = ac();
  const out = getMasterOut();
  if (!c || !out) return;
  try {
    const now = c.currentTime;
    const bufLen = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.6);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(hzStart, now);
    bp.frequency.exponentialRampToValueAtTime(Math.max(50, hzEnd), now + dur);
    bp.Q.value = 2.2;
    let last: AudioNode = bp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CC = c as any;
    if (typeof CC.createStereoPanner === "function") {
      const p = CC.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      bp.connect(p);
      last = p;
    }
    src.connect(g).connect(bp);
    last.connect(out);
    src.start(now);
  } catch {
    /* noop */
  }
}

/* ─── New named SFX (used across the app) ─── */

/** Warm cursor-hover chirp — a very short sine at ~1400Hz with a pitch drop. */
export const sfxHover = () => osc("sine", 1600, 1400, 0.06, 0.025, 0, 4000);

/** Arm-tap on an orb — noise burst + descending sine. */
export const sfxArmTap = (pan = 0) => {
  osc("sine", 900, 380, 0.11, 0.05, pan, 2000);
  noise(0.08, 0.05, 3800, 900, pan);
};

/** Focus tone when an orb becomes the "target" of the arms. */
export const sfxFocus = (hue = 220) => {
  const base = 400 + (hue / 360) * 500;
  osc("triangle", base, base * 1.15, 0.35, 0.028, 0, 3200);
};

/** Portal-boom on route change — deep whoomp + rising sparkle. */
export const sfxPortalBoom = () => {
  osc("sine", 70, 180, 0.9, 0.18, 0, 500);
  osc("triangle", 800, 2400, 0.5, 0.03, 0, 5000);
  noise(0.35, 0.06, 1200, 6000, 0);
};

/** Planet ping — bright sine at a hue-mapped frequency. */
export const sfxPlanetPing = (hue = 220, pan = 0) => {
  const base = 340 + (hue / 360) * 620;
  osc("sine", base, base * 0.92, 0.55, 0.05, pan, 4200);
  osc("sine", base * 2, base * 1.9, 0.4, 0.02, pan, 6000);
};

/** Double-click sparkle burst — a chord of high sines. */
export const sfxSparkleBurst = (pan = 0) => {
  const notes = [880, 1109, 1319, 1760];
  notes.forEach((f, i) =>
    setTimeout(() => osc("sine", f, f * 1.02, 0.32, 0.022, pan, 6000), i * 22),
  );
};

/** Cursor "swipe" whoosh — for fast mouse motion trails. */
export const sfxSwipe = (pan = 0) => noise(0.16, 0.05, 2200, 600, pan);

/** Cursor-orb-arm reach extension — soft rising synth. */
export const sfxArmExtend = () => osc("triangle", 500, 900, 0.22, 0.02, 0, 3500);

/** Tutorial "next" chime. */
export const sfxTutorialNext = () => {
  osc("sine", 660, 660, 0.09, 0.05, 0, 4000);
  setTimeout(() => osc("sine", 880, 880, 0.14, 0.05, 0, 4500), 90);
};

/** Boot chord — richer than the old playBoot. */
export const sfxBootChord = () => {
  const notes = [220, 330, 440, 660, 880];
  notes.forEach((f, i) =>
    setTimeout(() => osc("sine", f, f, 0.9, 0.035 - i * 0.003, 0, 3000), i * 65),
  );
  noise(0.4, 0.03, 200, 6000, 0);
};
