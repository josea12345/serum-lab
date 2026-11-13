export const CATEGORIES = ["Keys", "Bass", "Lead", "Pluck", "Pad", "Texture"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Descriptive wavetable suggestions — map to the closest table in your Serum 2 library. */
export const WAVETABLES = [
  "Basic Shapes", "Sine Harmonics", "Digital Bell", "Glass Partials", "Warm FM", "Soft Square",
  "Saw Stack", "Pulse Width", "Vowel Formant", "Spectral Pad", "Granular Air", "Noise Shimmer",
] as const;
export const FILTER_TYPES = [
  "MG Low 12", "MG Low 24", "Low 12", "Low 24", "High 12", "Band 12", "Peak 12", "Comb +", "Acid Ladder", "Diode LP", "Formant",
] as const;
export const LFO_SHAPES = ["Sine", "Triangle", "Saw", "Square", "Random S&H"] as const;
export const MOD_TARGETS = [
  "Filter Cutoff", "Osc A WT Pos", "Osc B WT Pos", "Osc A Fine", "Osc B Fine", "Osc B Level", "Amp Level", "Pan", "Reverb Mix",
] as const;
export const DIST_MODES = ["Tube", "Soft Clip", "Hard Clip", "Diode", "Bit Crush", "Downsample"] as const;

export interface Osc {
  enabled: boolean; wavetable: string; wtPos: number; octave: number; semi: number; fine: number;
  unison: number; detune: number; blend: number; level: number; pan: number;
}
export interface Env { attack: number; hold: number; decay: number; sustain: number; release: number }
export interface ModEnv extends Env { target: string; amount: number }
export interface Lfo { shape: string; rate: number; target: string; amount: number }

export interface Patch {
  schema: "serumlab.patch/1";
  id: string; name: string; description: string; category: Category; tags: string[]; prompt: string;
  oscA: Osc; oscB: Osc; oscC: Osc;
  sub: { enabled: boolean; octave: number; level: number };
  noise: { enabled: boolean; level: number };
  filter: { enabled: boolean; type: string; cutoff: number; resonance: number; drive: number; mix: number };
  ampEnv: Env; env2: ModEnv; lfo1: Lfo; lfo2: Lfo;
  fx: {
    distortion: { enabled: boolean; mode: string; drive: number; mix: number };
    chorus: { enabled: boolean; rate: number; depth: number; mix: number };
    delay: { enabled: boolean; time: number; feedback: number; mix: number };
    reverb: { enabled: boolean; size: number; decay: number; damping: number; mix: number };
    eq: { enabled: boolean; lowGain: number; highGain: number };
    compressor: { enabled: boolean; threshold: number; ratio: number; mix: number };
    dimension: { enabled: boolean; size: number; mix: number };
  };
  global: { voices: number; portamento: number; master: number };
  createdAt: string; updatedAt: string;
}