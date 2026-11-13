export const CATEGORIES = ["Keys", "Bass", "Lead", "Pluck", "Pad", "Texture"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Exact Serum 2 factory wavetable files with verified preset references. */
export const WAVETABLES = [
  "Default Shapes", "Analog / Basic Shapes", "Warm Analog / DM-OSCAR", "PWM / Juno",
  "Analog / Basic Mini", "Warm Sub", "Digital / Basic OPL", "Harmonic Series Smooth",
  "Dying Sine", "Acid", "FM Piano", "JF Flute",

] as const;
export const SERUM_FACTORY_WAVETABLES: Record<(typeof WAVETABLES)[number], { path: string; frames: number; sampleRate: number; channels: number }> = {
 "Default Shapes": { path: "S2 Tables/Default Shapes.wav", frames: 18432, sampleRate: 44100, channels: 1 },
 "Analog / Basic Shapes": { path: "Analog/Basic Shapes.wav", frames: 14336, sampleRate: 44100, channels: 1 },
 "Warm Analog / DM-OSCAR": { path: "S2 Tables/Analog/DM - OSCAR.wav", frames: 8192, sampleRate: 44100, channels: 1 },
 "PWM / Juno": { path: "Analog/PWM Juno.wav", frames: 229376, sampleRate: 44100, channels: 1 },
 "Analog / Basic Mini": { path: "Analog/Basic Mini.wav", frames: 8192, sampleRate: 44100, channels: 1 },
 "Warm Sub": { path: "S2 Tables/Analog/Warm Sub.wav", frames: 4096, sampleRate: 44100, channels: 1 },
 "Digital / Basic OPL": { path: "S2 Tables/Digital/Basic OPL.wav", frames: 16384, sampleRate: 44100, channels: 1 },
 "Harmonic Series Smooth": { path: "S2 Tables/Digital/Harmonic Series Smooth.wav", frames: 49152, sampleRate: 44100, channels: 1 },
 "Dying Sine": { path: "S2 Tables/Digital/Dying Sine.wav", frames: 524288, sampleRate: 44100, channels: 1 },
 "Acid": { path: "Analog/Acid.wav", frames: 81920, sampleRate: 44100, channels: 1 },
 "FM Piano": { path: "S2 Tables/Digital/FM Piano.wav", frames: 4096, sampleRate: 44100, channels: 1 },
 "JF Flute": { path: "S2 Tables/Digital/JF Flute.wav", frames: 524288, sampleRate: 44100, channels: 1 },
};
export const WARP_MODES = ["None", "Sync", "PWM", "Bend +", "Wavefold", "Soft Clip", "Hard Clip", "Quantize", "Filter LPF", "Filter HPF"] as const;
export const FILTER_TYPES = [
  "MG Low 12", "MG Low 24", "Low 12", "Low 24", "High 12", "Band 12", "Peak 12", "Comb +", "Acid Ladder", "Diode LP", "Formant",
] as const;
export const LFO_SHAPES = ["Sine", "Triangle", "Saw", "Square", "Random S&H"] as const;
export const MOD_TARGETS = [
  "Filter Cutoff", "Osc A WT Pos", "Osc B WT Pos", "Osc C WT Pos", "Osc A Fine", "Osc B Fine", "Osc B Level", "Pan", "Reverb Mix",
] as const;
export const DIST_MODES = ["Tube", "Soft Clip", "Hard Clip", "Diode", "Bit Crush", "Downsample"] as const;

export interface Osc {
  enabled: boolean; wavetable: string; wtPos: number; warpMode: (typeof WARP_MODES)[number]; warpAmount: number; warpMode2: (typeof WARP_MODES)[number]; warpAmount2: number; octave: number; semi: number; fine: number;
  unison: number; detune: number; blend: number; level: number; pan: number;
}
export interface Env { attack: number; hold: number; decay: number; sustain: number; release: number }
export interface ModEnv extends Env { target: string; amount: number }
export interface Lfo { shape: string; rate: number; target: string; amount: number }
export interface MacroControl { name: string; value: number; target: string; amount: number }

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
  macros: MacroControl[];
  global: { voices: number; portamento: number; master: number };
  createdAt: string; updatedAt: string;
}