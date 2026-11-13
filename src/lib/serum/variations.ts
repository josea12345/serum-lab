import type { Patch } from "./types";
import { clamp, round } from "./util";

export type Mutator = (p: Patch) => void;

const cutoff = (p: Patch, f: number) => (p.filter.cutoff = round(clamp(p.filter.cutoff * f, 40, 20000), 10));

export const MUTATORS = {
  darker: (p) => {
    cutoff(p, 0.6);
    p.fx.eq.highGain = clamp(p.fx.eq.highGain - 3, -12, 12);
    p.oscA.wtPos = clamp(p.oscA.wtPos - 10, 0, 100);
    p.fx.reverb.damping = clamp(p.fx.reverb.damping + 15, 0, 100);
  },
  brighter: (p) => {
    cutoff(p, 1.6);
    p.fx.eq.highGain = clamp(p.fx.eq.highGain + 3, -12, 12);
    p.filter.resonance = clamp(p.filter.resonance + 5, 0, 100);
    p.oscA.wtPos = clamp(p.oscA.wtPos + 10, 0, 100);
    p.fx.reverb.damping = clamp(p.fx.reverb.damping - 15, 0, 100);
  },
  wider: (p) => {
    p.oscA.unison = clamp(p.oscA.unison + 2, 1, 16);
    p.oscB.unison = clamp(p.oscB.unison + 1, 1, 16);
    p.oscA.detune = clamp(p.oscA.detune + 8, 0, 100);
    p.oscA.blend = clamp(p.oscA.blend + 10, 0, 100);
    p.fx.chorus.enabled = true;
    p.fx.chorus.mix = clamp(p.fx.chorus.mix + 10, 0, 100);
    p.fx.dimension.enabled = true;
    p.fx.dimension.size = clamp(p.fx.dimension.size + 15, 0, 100);
    p.fx.dimension.mix = clamp(p.fx.dimension.mix + 10, 0, 100);
  },
  softer: (p) => {
    p.ampEnv.attack = round(clamp(p.ampEnv.attack * 1.8 + 5, 0, 10000));
    p.filter.drive = round(p.filter.drive * 0.5);
    p.filter.resonance = clamp(p.filter.resonance - 8, 0, 100);
    p.fx.distortion.drive = round(p.fx.distortion.drive * 0.5);
    p.fx.compressor.ratio = clamp(round(p.fx.compressor.ratio - 0.5, 0.1), 1, 20);
    p.fx.eq.highGain = clamp(p.fx.eq.highGain - 2, -12, 12);
  },
  bell: (p) => {
    p.oscB.enabled = true;
    p.oscB.wavetable = "Digital Bell";
    p.oscB.wtPos = clamp(p.oscB.wtPos + 15, 0, 100);
    p.oscB.octave = clamp(Math.max(p.oscB.octave, 1), -4, 4);
    p.oscB.level = clamp(p.oscB.level + 10, 0, 100);
    p.ampEnv.attack = Math.min(p.ampEnv.attack, 5);
    p.ampEnv.sustain = clamp(p.ampEnv.sustain - 15, 0, 100);
    p.env2.target = "Filter Cutoff";
    p.env2.decay = 300;
    p.env2.amount = clamp(p.env2.amount + 12, -100, 100);
  },
  warmer: (p) => {
    cutoff(p, 0.8);
    p.filter.drive = clamp(p.filter.drive + 10, 0, 100);
    p.fx.distortion.enabled = true;
    p.fx.distortion.mode = "Tube";
    p.fx.eq.lowGain = clamp(p.fx.eq.lowGain + 2, -12, 12);
    p.sub.enabled = true;
  },
  grittier: (p) => {
    p.fx.distortion.enabled = true;
    p.fx.distortion.drive = clamp(p.fx.distortion.drive + 25, 0, 100);
    p.fx.distortion.mix = clamp(p.fx.distortion.mix + 15, 0, 100);
    p.filter.drive = clamp(p.filter.drive + 20, 0, 100);
  },
  spacious: (p) => {
    p.fx.reverb.enabled = true;
    p.fx.reverb.size = clamp(p.fx.reverb.size + 12, 0, 100);
    p.fx.reverb.decay = clamp(round(p.fx.reverb.decay * 1.4, 0.1), 0.1, 20);
    p.fx.reverb.mix = clamp(p.fx.reverb.mix + 10, 0, 100);
    p.ampEnv.release = round(clamp(p.ampEnv.release * 1.4, 0, 15000));
    p.fx.delay.enabled = true;
  },
  tighter: (p) => {
    p.ampEnv.attack = Math.min(p.ampEnv.attack, 2);
    p.ampEnv.release = round(clamp(p.ampEnv.release * 0.4, 20, 15000));
    p.fx.reverb.mix = clamp(p.fx.reverb.mix - 12, 0, 100);
    p.fx.delay.mix = clamp(p.fx.delay.mix - 8, 0, 100);
  },
  lofi: (p) => {
    p.fx.distortion.enabled = true;
    p.fx.distortion.mode = "Downsample";
    p.fx.distortion.mix = clamp(p.fx.distortion.mix + 10, 0, 100);
    p.oscA.fine = clamp(p.oscA.fine - 8, -100, 100);
    p.lfo2 = { shape: "Random S&H", rate: 0.8, target: "Osc A Fine", amount: 10 };
    cutoff(p, 0.7);
  },
  evolving: (p) => {
    p.lfo1.amount = clamp(p.lfo1.amount + 15, -100, 100);
    p.lfo1.rate = clamp(round(p.lfo1.rate * 0.6, 0.01), 0.01, 20);
    p.lfo1.target = "Osc A WT Pos";
  },
  wobble: (p) => {
    p.lfo1 = { shape: "Sine", rate: 2, target: "Filter Cutoff", amount: 55 };
  },
} satisfies Record<string, Mutator>;
export type MutatorKey = keyof typeof MUTATORS;

export const VARIATIONS: { key: MutatorKey; label: string }[] = [
  { key: "darker", label: "Darker" },
  { key: "brighter", label: "Brighter" },
  { key: "wider", label: "Wider" },
  { key: "softer", label: "Softer" },
  { key: "bell", label: "More Bell-like" },
  { key: "warmer", label: "Warmer" },
  { key: "spacious", label: "More Space" },
];

export function applyVariation(p: Patch, key: MutatorKey, now = new Date().toISOString()): Patch {
  const next: Patch = JSON.parse(JSON.stringify(p));
  MUTATORS[key](next);
  next.updatedAt = now;
  return next;
}