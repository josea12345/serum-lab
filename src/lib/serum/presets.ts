import type { Category, Patch } from "./types";

export const CELESTIAL_KEYS: Patch = {
  schema: "serumlab.patch/1",
  id: "celestial-keys",
  name: "CELESTIAL KEYS",
  description:
    "Dreamy, futuristic dark melodic keys. A soft bell-like transient from FM partials sits on a warm sine-heavy body, widened with gentle unison, chorus and dimension, then bloomed into a long, spacious release.",
  category: "Keys",
  tags: ["Keys", "Dreamy", "Dark", "Bell", "Wide", "Spacious"],
  prompt: "dreamy futuristic dark melodic keys with a soft bell transient",
  oscA: { enabled: true, wavetable: "Warm Analog / DM-OSCAR", wtPos: 32, warpMode: "None", warpAmount: 0, warpMode2: "None", warpAmount2: 0, octave: 0, semi: 0, fine: 0, unison: 3, detune: 12, blend: 40, level: 78, pan: 0 },
  oscB: { enabled: true, wavetable: "FM Piano", wtPos: 58, warpMode: "None", warpAmount: 0, warpMode2: "None", warpAmount2: 0, octave: 1, semi: 0, fine: 6, unison: 2, detune: 8, blend: 30, level: 42, pan: 0 },
  oscC: { enabled: false, wavetable: "Harmonic Series Smooth", wtPos: 40, warpMode: "None", warpAmount: 0, warpMode2: "None", warpAmount2: 0, octave: 0, semi: 0, fine: 0, unison: 1, detune: 0, blend: 50, level: 25, pan: 0 },
  sub: { enabled: true, octave: -1, level: 22 },
  noise: { enabled: false, level: 6 },
  filter: { enabled: true, type: "MG Low 24", cutoff: 2400, resonance: 18, drive: 12, mix: 100 },
  ampEnv: { attack: 6, hold: 0, decay: 1400, sustain: 62, release: 2200 },
  env2: { attack: 0, hold: 0, decay: 480, sustain: 20, release: 900, target: "Filter Cutoff", amount: 34 },
  lfo1: { shape: "Sine", rate: 0.25, target: "Osc A WT Pos", amount: 14 },
  lfo2: { shape: "Triangle", rate: 4.8, target: "Osc B Fine", amount: 6 },
  fx: {
    distortion: { enabled: true, mode: "Tube", drive: 14, mix: 30 },
    chorus: { enabled: true, rate: 0.6, depth: 32, mix: 35 },
    delay: { enabled: true, time: 375, feedback: 32, mix: 18 },
    reverb: { enabled: true, size: 78, decay: 5.5, damping: 55, mix: 32 },
    eq: { enabled: true, lowGain: -2, highGain: -3 },
    compressor: { enabled: true, threshold: -18, ratio: 2.5, mix: 70 },
    dimension: { enabled: true, size: 55, mix: 40 },
  },
  global: { voices: 8, portamento: 0, master: 75 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Coherent starting points per category that keyword modifiers build on. */
export function categoryBase(cat: Category): Patch {
  const p = clone(CELESTIAL_KEYS);
  p.category = cat;
  p.tags = [cat];
  switch (cat) {
    case "Keys":
      break;
    case "Bass":
      Object.assign(p.oscA, { wavetable: "Analog / Basic Shapes", wtPos: 20, warpMode: "None", warpAmount: 0, warpMode2: "None", warpAmount2: 0, octave: -1, unison: 1, detune: 0, level: 80 });
      Object.assign(p.oscB, { wavetable: "Warm Sub", octave: -1, unison: 1, fine: 0, level: 35 });
      p.sub = { enabled: true, octave: -1, level: 60 };
      Object.assign(p.filter, { type: "MG Low 24", cutoff: 900, resonance: 22, drive: 30 });
      p.ampEnv = { attack: 1, hold: 0, decay: 500, sustain: 80, release: 120 };
      Object.assign(p.env2, { decay: 220, sustain: 10, amount: 40 });
      Object.assign(p.fx.reverb, { enabled: false, mix: 8 });
      Object.assign(p.fx.delay, { enabled: false });
      Object.assign(p.fx.chorus, { enabled: false });
      Object.assign(p.fx.dimension, { enabled: false });
      Object.assign(p.fx.distortion, { drive: 30, mix: 45 });
      Object.assign(p.fx.compressor, { threshold: -22, ratio: 4 });
      p.global = { voices: 1, portamento: 40, master: 78 };
      break;
    case "Lead":
      Object.assign(p.oscA, { wavetable: "Analog / Basic Shapes", wtPos: 45, unison: 5, detune: 18, level: 80 });
      Object.assign(p.oscB, { wavetable: "PWM / Juno", octave: 0, fine: 7, unison: 3, level: 50 });
      p.sub.enabled = false;
      Object.assign(p.filter, { type: "Low 12", cutoff: 5200, resonance: 20, drive: 20 });
      p.ampEnv = { attack: 4, hold: 0, decay: 600, sustain: 85, release: 350 };
      Object.assign(p.fx.reverb, { size: 55, decay: 2.5, mix: 18 });
      Object.assign(p.fx.distortion, { drive: 25, mix: 35 });
      p.global = { voices: 1, portamento: 60, master: 74 };
      break;
    case "Pluck":
      Object.assign(p.oscA, { wavetable: "Harmonic Series Smooth", wtPos: 50, unison: 2, detune: 10 });
      Object.assign(p.filter, { type: "Low 24", cutoff: 1400, resonance: 20 });
      p.ampEnv = { attack: 1, hold: 0, decay: 380, sustain: 0, release: 420 };
      Object.assign(p.env2, { decay: 260, sustain: 0, amount: 55 });
      Object.assign(p.fx.delay, { time: 250, feedback: 38, mix: 24 });
      break;
    case "Pad":
      Object.assign(p.oscA, { wavetable: "Harmonic Series Smooth", wtPos: 40, unison: 7, detune: 22, blend: 60 });
      Object.assign(p.oscB, { wavetable: "Analog / Basic Shapes", octave: 0, unison: 5, detune: 18, level: 40 });
      Object.assign(p.filter, { cutoff: 1800, resonance: 12 });
      p.ampEnv = { attack: 1200, hold: 0, decay: 2000, sustain: 85, release: 4200 };
      Object.assign(p.lfo1, { rate: 0.12, amount: 28 });
      Object.assign(p.fx.reverb, { size: 92, decay: 9, mix: 45 });
      break;
    case "Texture":
      Object.assign(p.oscA, { wavetable: "Dying Sine", wtPos: 60, unison: 4, detune: 25 });
      Object.assign(p.oscB, { wavetable: "Digital / Basic OPL", octave: 1, level: 30 });
      p.noise = { enabled: true, level: 24 };
      Object.assign(p.filter, { type: "Band 12", cutoff: 2600, resonance: 30 });
      p.ampEnv = { attack: 2000, hold: 0, decay: 3000, sustain: 70, release: 5000 };
      Object.assign(p.lfo1, { shape: "Random S&H", rate: 0.4, target: "Filter Cutoff", amount: 30 });
      Object.assign(p.fx.reverb, { size: 100, decay: 12, mix: 55 });
      Object.assign(p.fx.distortion, { mode: "Bit Crush", drive: 20, mix: 20 });
      break;
  }
  return p;
}