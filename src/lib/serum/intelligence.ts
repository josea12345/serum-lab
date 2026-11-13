import type { Category, Patch } from "./types";

export type SoundArchitecture = {
  id: string;
  name: string;
  sourcePlan: string;
  reason: string;
};

const has = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

/**
 * A compact, deterministic architecture planner. Gemini receives this plan as
 * constraints; the offline engine applies it directly. Variation changes the
 * instrument concept, not a handful of random parameter values.
 */
export function planSoundArchitecture(prompt: string, category: Category, variation = 0): SoundArchitecture {
  const t = prompt.toLowerCase();
  const rhodes = has(t, ["rhodes", "electric piano", "epiano", " tine", "tines", "soul", "r&b", "rnb"]);
  const piano = has(t, ["piano", "felt", "acoustic", "emotive", "emotional", "fred again", "fred-again"]) && !rhodes;
  const bell = has(t, ["bell", "chime", "mallet", "glass", "glassy", "celesta", "glock"]);
  const evolving = has(t, ["evolving", "moving", "breathing", "morph", "shifting", "ambient", "cinematic"]);
  const pluck = category === "Pluck" || has(t, ["pluck", "plucky", "short", "staccato", "arp", "arpeggio"]);
  const bass = category === "Bass" || has(t, ["bass", "808", "sub", "reese"]);
  const pad = category === "Pad" || has(t, ["pad", "swell", "strings", "choir"]);
  const texture = category === "Texture" || has(t, ["texture", "granular", "glitch", "drone", "soundscape"]);

  let family: SoundArchitecture[];
  if (bass) family = [
    { id: "mono-reese", name: "Mono Reese / centered sub", sourcePlan: "A: Basic Shapes fundamental/body; B: PWM Juno harmonic edge, lightly detuned; dedicated centered sub. One voice, tight envelope, controlled low-pass.", reason: "A stable mono fundamental carries the low end while a separate upper layer supplies audible grit." },
    { id: "clean-sub", name: "Clean sub with upper bite", sourcePlan: "A: Warm Sub fundamental; B: Digital Basic OPL upper bite, one octave up; centered sub, minimal effects.", reason: "Separates the fundamental from the audible attack and upper harmonics." },
    { id: "saturated-bass", name: "Saturated analog bass", sourcePlan: "A: Analog Basic Shapes body with Soft Clip warp at restrained depth; B: DM-OSCAR harmonic layer; mono, moderate drive, no reverb.", reason: "Builds harmonics before restrained saturation instead of widening the low end." },
  ];
  else if (pad || texture) family = [
    { id: "evolving-harmonic-pad", name: "Evolving harmonic pad", sourcePlan: "A: Harmonic Series Smooth sustained bed; B: DM-OSCAR midrange body; C: JF Flute-like airy upper layer at low level. Slow independent movement, long but controlled release.", reason: "Three layers occupy bed, body and air roles; motion is slow enough to avoid competing with the arrangement." },
    { id: "dark-spectral-bed", name: "Dark moving bed", sourcePlan: "A: Dying Sine evolving harmonic core; B: Basic OPL upper partials; C off unless it adds a distinct transient. Restrained unison and filtered movement.", reason: "Uses evolving partials and controlled filtering rather than stacking detuned saws." },
    { id: "analog-cloud", name: "Analog cloud", sourcePlan: "A: DM-OSCAR warm body; B: Basic Shapes soft upper layer; modest unison on upper layer only, slow drift, restrained room.", reason: "Maintains a stable center while the upper spectrum provides width and motion." },
  ];
  else if (bell) family = [
    { id: "fm-bell", name: "FM tine / bell", sourcePlan: "A: FM Piano as the inharmonic transient and upper partial source; B: Warm Analog DM-OSCAR one octave down as a quiet body; short excitation, natural decay, little chorus.", reason: "The bright partials decay independently from the warmer body, preserving a bell-like onset." },
    { id: "glass-mallet", name: "Glass mallet", sourcePlan: "A: Dying Sine as a bright, evolving partial source; B: FM Piano as a quieter secondary strike; short envelope and focused filter.", reason: "Keeps the attack spectral and exposed rather than burying it in reverb." },
  ];
  else if (pluck) family = [
    { id: "digital-pluck", name: "Digital transient pluck", sourcePlan: "A: Digital Basic OPL for a defined transient; B: Warm Analog DM-OSCAR one octave down for body; very fast attack, short decay, near-zero sustain.", reason: "Separates the attack from the resonant body and leaves space between notes." },
    { id: "fm-pluck", name: "FM tine pluck", sourcePlan: "A: FM Piano for upper partials; B: Basic Shapes as a quiet fundamental; short mod-envelope brightness sweep, controlled delay.", reason: "A transient-led spectrum provides articulation without relying on a loud effect chain." },
  ];
  else if (category === "Lead") family = [
    { id: "focused-lead", name: "Focused mono lead", sourcePlan: "A: Analog Basic Shapes core; B: Harmonic Series Smooth upper edge; mono/legato behavior, stable pitch center and restrained glide.", reason: "A clear pitch center cuts through while a quieter upper layer adds definition." },
    { id: "formant-lead", name: "Bright animated lead", sourcePlan: "A: Basic OPL bright core; B: PWM Juno pulse layer with restrained warp; controlled filter movement and short release.", reason: "Movement is assigned to harmonics and filter rather than excessive stereo detune." },
  ];
  else if (piano || rhodes || category === "Keys") family = [
    { id: "emotive-keys", name: "Emotive dance keys", sourcePlan: "A: Warm Analog DM-OSCAR as the rounded sustained body; B: FM Piano one octave up at low level for tine/transient detail; C off. Fast onset, natural decaying body, subtle pitch drift, restrained short ambience.", reason: "The attack and body have separate roles; the core stays centered and readable in chords." },
    { id: "rhodes-keys", name: "Rounded Rhodes-inspired keys", sourcePlan: "A: DM-OSCAR warm body; B: FM Piano tine layer at low level; gentle saturation and restrained chorus, moderate decay, short room.", reason: "A restrained tine layer adds character without turning the patch into a harsh bell." },
    { id: "glass-keys", name: "Glass upper-register keys", sourcePlan: "A: Analog Basic Shapes clean body; B: FM Piano upper partials; bright transient, moderate decay, controlled high end and minimal stereo spread.", reason: "The spectral contrast comes from the upper partial layer, not extreme unison." },
  ];
  else family = [
    { id: "subtractive-core", name: "Subtractive focused core", sourcePlan: "A: Analog Basic Shapes core; B: Harmonic Series Smooth at low level for upper detail; filter and envelope provide the motion.", reason: "A coherent single core with a purposeful harmonic support layer." },
    { id: "digital-hybrid", name: "Digital hybrid voice", sourcePlan: "A: Basic OPL digital source; B: DM-OSCAR warm body; controlled warp and envelope contrast.", reason: "Contrasting digital attack and analog body produce a distinct voice." },
  ];

  const preferenceOffset = rhodes && !piano && family.some((item) => item.id === "rhodes-keys") ? 1 : 0;
  const chosen = family[((Math.max(0, variation) + preferenceOffset + (evolving && family.length > 2 ? 1 : 0)) % family.length)];
  return chosen;
}

/** Apply an explicit architecture when Gemini is unavailable. All table names are
 * members of the app's verified factory-table allowlist. */
export function applySoundArchitecture(p: Patch, prompt: string, category: Category, variation = 0): SoundArchitecture {
  const plan = planSoundArchitecture(prompt, category, variation);
  const t = prompt.toLowerCase();
  const wide = has(t, ["wide", "stereo", "lush", "expansive"]);
  const wet = has(t, ["ambient", "spacious", "cinematic", "washed", "ethereal"]);
  const dirty = has(t, ["gritty", "dirty", "aggressive", "distorted", "growl"]);
  const osc = (key: "oscA" | "oscB" | "oscC", values: Partial<Patch["oscA"]>) => Object.assign(p[key], values);
  const neutral = { warpMode: "None" as const, warpAmount: 0, warpMode2: "None" as const, warpAmount2: 0, unison: 1, detune: 0, blend: 50, pan: 0, fine: 0, semi: 0 };
  const setEnvs = (attack: number, decay: number, sustain: number, release: number, modDecay = 300, modAmount = 24) => {
    p.ampEnv = { attack, hold: 0, decay, sustain, release };
    p.env2 = { attack: 0, hold: 0, decay: modDecay, sustain: 0, release: 120, target: "Filter Cutoff", amount: modAmount };
  };

  osc("oscA", { ...neutral, enabled: true, level: 78, octave: 0, wavetable: "Analog / Basic Shapes", wtPos: 0 });
  osc("oscB", { ...neutral, enabled: true, level: 20, octave: 1, wavetable: "Harmonic Series Smooth", wtPos: 22 });
  osc("oscC", { ...neutral, enabled: false, level: 0, octave: 0, wavetable: "JF Flute", wtPos: 0 });
  p.sub.enabled = false; p.noise.enabled = false;
  p.filter.enabled = true; p.filter.type = "MG Low 12"; p.filter.cutoff = 7200; p.filter.resonance = 8; p.filter.drive = 3; p.filter.mix = 100;
  p.lfo1 = { shape: "Sine", rate: 0.18, target: "Osc A Fine", amount: 2 };
  p.lfo2 = { shape: "Triangle", rate: 0.23, target: "Pan", amount: 3 };
  p.global.voices = 8; p.global.portamento = 0; p.global.master = 72;
  p.fx.distortion.enabled = false; p.fx.distortion.drive = 0; p.fx.distortion.mix = 0;
  p.fx.chorus.enabled = false; p.fx.chorus.mix = 0;
  p.fx.dimension.enabled = false; p.fx.dimension.mix = 0;
  p.fx.delay.enabled = false; p.fx.delay.mix = 0;
  p.fx.reverb.enabled = wet; p.fx.reverb.size = 62; p.fx.reverb.decay = wet ? 4.2 : 1.8; p.fx.reverb.damping = 68; p.fx.reverb.mix = wet ? 18 : 8;
  p.fx.eq.enabled = true; p.fx.eq.lowGain = -1; p.fx.eq.highGain = -1;
  p.fx.compressor.enabled = false; p.fx.compressor.mix = 0;

  switch (plan.id) {
    case "emotive-keys":
      osc("oscA", { wavetable: "Warm Analog / DM-OSCAR", wtPos: 18, level: 78 });
      osc("oscB", { wavetable: "FM Piano", wtPos: 12, octave: 1, level: 24 });
      setEnvs(3, 1350, 36, wet ? 950 : 520, 330, 26);
      p.filter.cutoff = 6800; p.fx.delay.enabled = wet; p.fx.delay.time = 375; p.fx.delay.feedback = 22; p.fx.delay.mix = wet ? 10 : 0;
      p.fx.chorus.enabled = wide; p.fx.chorus.rate = 0.22; p.fx.chorus.depth = 12; p.fx.chorus.mix = wide ? 9 : 0;
      break;
    case "rhodes-keys":
      osc("oscA", { wavetable: "Warm Analog / DM-OSCAR", wtPos: 12, level: 80 });
      osc("oscB", { wavetable: "FM Piano", wtPos: 6, octave: 1, level: 20 });
      setEnvs(2, 1150, 32, 430, 260, 20);
      p.filter.cutoff = 5900; p.filter.drive = 7;
      p.fx.distortion.enabled = true; p.fx.distortion.mode = "Tube"; p.fx.distortion.drive = 7; p.fx.distortion.mix = 9;
      p.fx.chorus.enabled = true; p.fx.chorus.rate = 0.28; p.fx.chorus.depth = 15; p.fx.chorus.mix = 10;
      break;
    case "glass-keys":
      osc("oscA", { wavetable: "Analog / Basic Shapes", level: 76 });
      osc("oscB", { wavetable: "FM Piano", level: 25, octave: 1 });
      setEnvs(1, 980, 26, 380, 190, 30);
      p.filter.cutoff = 9800; p.filter.resonance = 5;
      break;
    case "fm-bell":
      osc("oscA", { wavetable: "FM Piano", level: 72, octave: 0 });
      osc("oscB", { wavetable: "Warm Analog / DM-OSCAR", level: 17, octave: -1 });
      setEnvs(0, 1250, 0, 680, 220, 34);
      p.filter.cutoff = 11200; p.filter.resonance = 12;
      p.fx.reverb.enabled = true; p.fx.reverb.mix = 15; p.fx.reverb.decay = 2.4;
      break;
    case "glass-mallet":
      osc("oscA", { wavetable: "Dying Sine", level: 70 });
      osc("oscB", { wavetable: "FM Piano", level: 20, octave: 1 });
      setEnvs(0, 1450, 0, 720, 180, 42);
      p.filter.cutoff = 12500;
      p.fx.reverb.enabled = true; p.fx.reverb.mix = 13;
      break;
    case "digital-pluck":
      osc("oscA", { wavetable: "Digital / Basic OPL", level: 70 });
      osc("oscB", { wavetable: "Warm Analog / DM-OSCAR", level: 25, octave: -1 });
      setEnvs(0, 420, 0, 240, 160, 42);
      p.filter.cutoff = 8200; p.fx.delay.enabled = true; p.fx.delay.time = 280; p.fx.delay.feedback = 20; p.fx.delay.mix = 12;
      break;
    case "fm-pluck":
      osc("oscA", { wavetable: "FM Piano", level: 66 });
      osc("oscB", { wavetable: "Analog / Basic Shapes", level: 25, octave: -1 });
      setEnvs(0, 520, 0, 280, 220, 35);
      p.filter.cutoff = 9000; p.fx.delay.enabled = true; p.fx.delay.time = 375; p.fx.delay.feedback = 24; p.fx.delay.mix = 13;
      break;
    case "mono-reese":
    case "saturated-bass":
      osc("oscA", { wavetable: "Analog / Basic Shapes", level: 72, octave: 0, warpMode: plan.id === "saturated-bass" ? "Soft Clip" : "None", warpAmount: plan.id === "saturated-bass" ? 18 : 0 });
      osc("oscB", { wavetable: "PWM / Juno", level: 25, octave: 0, warpMode: "PWM", warpAmount: 18 });
      p.sub.enabled = true; p.sub.level = 48; p.sub.octave = -1;
      setEnvs(1, 700, 72, 140, 320, 24);
      p.filter.type = "MG Low 24"; p.filter.cutoff = dirty ? 2200 : 1250; p.filter.drive = dirty ? 12 : 3;
      p.global.voices = 1; p.fx.compressor.enabled = true; p.fx.compressor.threshold = -20; p.fx.compressor.ratio = 2.5; p.fx.compressor.mix = 24;
      p.fx.distortion.enabled = dirty || plan.id === "saturated-bass"; p.fx.distortion.mode = "Tube"; p.fx.distortion.drive = dirty ? 16 : 8; p.fx.distortion.mix = dirty ? 16 : 8;
      break;
    case "clean-sub":
      osc("oscA", { wavetable: "Warm Sub", level: 82 });
      osc("oscB", { wavetable: "Digital / Basic OPL", level: 17, octave: 1 });
      p.sub.enabled = true; p.sub.level = 38;
      setEnvs(0, 550, 82, 100, 200, 18);
      p.filter.type = "MG Low 24"; p.filter.cutoff = 1500; p.global.voices = 1;
      break;
    case "evolving-harmonic-pad":
      osc("oscA", { wavetable: "Harmonic Series Smooth", level: 70, unison: wide ? 4 : 2, detune: wide ? 12 : 5 });
      osc("oscB", { wavetable: "Warm Analog / DM-OSCAR", level: 27, octave: -1, unison: 2 });
      osc("oscC", { enabled: true, wavetable: "JF Flute", level: 9, octave: 1 });
      setEnvs(950, 2400, 78, 3600, 2600, 18);
      p.lfo1 = { shape: "Sine", rate: 0.11, target: "Osc A WT Pos", amount: 15 };
      p.lfo2 = { shape: "Triangle", rate: 0.07, target: "Pan", amount: 8 };
      p.filter.cutoff = 4200; p.fx.reverb.enabled = true; p.fx.reverb.mix = 24; p.fx.reverb.decay = 6.5;
      break;
    case "dark-spectral-bed":
      osc("oscA", { wavetable: "Dying Sine", level: 70, unison: 2, detune: 8 });
      osc("oscB", { wavetable: "Digital / Basic OPL", level: 18, octave: 1 });
      setEnvs(1400, 2600, 72, 4200, 3000, 22);
      p.lfo1 = { shape: "Triangle", rate: 0.08, target: "Filter Cutoff", amount: 22 };
      p.filter.type = "Band 12"; p.filter.cutoff = 2600;
      p.fx.reverb.enabled = true; p.fx.reverb.mix = 28; p.fx.reverb.decay = 7;
      break;
    case "analog-cloud":
      osc("oscA", { wavetable: "Warm Analog / DM-OSCAR", level: 74, unison: wide ? 5 : 3, detune: wide ? 15 : 8 });
      osc("oscB", { wavetable: "Analog / Basic Shapes", level: 22, octave: 1, unison: 2 });
      setEnvs(720, 2100, 82, 3200, 2400, 15);
      p.lfo1 = { shape: "Sine", rate: 0.13, target: "Osc A WT Pos", amount: 10 };
      p.filter.cutoff = 3800; p.fx.reverb.enabled = true; p.fx.reverb.mix = 22; p.fx.reverb.decay = 5.5;
      break;
    case "focused-lead":
      osc("oscA", { wavetable: "Analog / Basic Shapes", level: 75 });
      osc("oscB", { wavetable: "Harmonic Series Smooth", level: 23, octave: 1 });
      setEnvs(3, 800, 82, 320, 300, 12);
      p.global.voices = 1; p.filter.cutoff = 6200;
      break;
    case "formant-lead":
      osc("oscA", { wavetable: "Digital / Basic OPL", level: 72, warpMode: "Sync", warpAmount: 12 });
      osc("oscB", { wavetable: "PWM / Juno", level: 24, warpMode: "PWM", warpAmount: 15 });
      setEnvs(2, 700, 78, 260, 320, 18);
      p.global.voices = 1; p.filter.type = "Band 12"; p.filter.cutoff = 4200;
      break;
    default:
      setEnvs(4, 900, 60, 450);
  }

  if (category === "Bass") {
    p.oscA.unison = 1; p.oscB.unison = 1; p.oscC.enabled = false;
    p.oscA.pan = 0; p.oscB.pan = 0; p.global.voices = 1;
    p.fx.reverb.enabled = false; p.fx.chorus.enabled = false; p.fx.dimension.enabled = false;
  }
  return plan;
}

export type QualityReport = { score: number; checks: string[]; warnings: string[] };

/** Rule-based sound-design QA: repairs contradictions before a patch is exported. */
export function evaluateAndRepairPatch(p: Patch, prompt: string): QualityReport {
  const t = prompt.toLowerCase();
  const checks: string[] = [];
  const warnings: string[] = [];
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
  const isBass = p.category === "Bass" || has(t, ["bass", "808", "sub", "reese"]);
  const isPluck = p.category === "Pluck" || has(t, ["pluck", "staccato", "short", "pizz"]);
  const isPad = p.category === "Pad" || has(t, ["pad", "swell", "drone"]);
  const dry = has(t, ["dry", "intimate", "close", "upfront", "minimal"]);
  for (const key of ["oscA", "oscB", "oscC"] as const) {
    const o = p[key];
    o.level = clamp(o.level, 0, 100);
    o.unison = Math.round(clamp(o.unison, 1, 16));
    o.detune = clamp(o.detune, 0, 100);
    o.wtPos = clamp(o.wtPos, 0, 100);
    o.warpAmount = clamp(o.warpAmount, 0, 100);
    o.warpAmount2 = clamp(o.warpAmount2, 0, 100);
  }
  const active = [p.oscA, p.oscB, p.oscC].filter((o) => o.enabled);
  const levelSum = active.reduce((sum, o) => sum + o.level, 0) + (p.sub.enabled ? p.sub.level : 0) + (p.noise.enabled ? p.noise.level : 0);
  if (levelSum > 190) {
    const scale = 190 / levelSum;
    for (const o of active) o.level = Math.round(o.level * scale);
    if (p.sub.enabled) p.sub.level = Math.round(p.sub.level * scale);
    if (p.noise.enabled) p.noise.level = Math.round(p.noise.level * scale);
    warnings.push("Reduced stacked source levels to preserve headroom.");
  }
  checks.push("Source levels and oscillator ranges are safe");
  p.ampEnv.attack = clamp(p.ampEnv.attack, 0, 10000);
  p.ampEnv.decay = clamp(p.ampEnv.decay, 0, 15000);
  p.ampEnv.sustain = clamp(p.ampEnv.sustain, 0, 100);
  p.ampEnv.release = clamp(p.ampEnv.release, 0, 15000);
  if (isBass) {
    p.global.voices = 1; p.sub.enabled = true;
    for (const o of [p.oscA, p.oscB, p.oscC]) { o.unison = 1; o.detune = 0; o.pan = 0; }
    p.oscC.enabled = false;
    p.fx.reverb.enabled = false; p.fx.chorus.enabled = false; p.fx.dimension.enabled = false;
    p.ampEnv.attack = Math.min(p.ampEnv.attack, 4); p.ampEnv.release = Math.min(p.ampEnv.release, 260);
  }
  if (isPluck) {
    p.ampEnv.attack = Math.min(p.ampEnv.attack, 5);
    p.ampEnv.sustain = Math.min(p.ampEnv.sustain, 12);
    p.ampEnv.release = Math.min(p.ampEnv.release, 650);
  }
  if (isPad) {
    p.ampEnv.attack = Math.max(p.ampEnv.attack, 250);
    p.ampEnv.release = Math.max(p.ampEnv.release, 1200);
  }
  checks.push("Envelope matches the instrument's articulation");
  p.filter.cutoff = clamp(p.filter.cutoff, 20, 20000);
  p.filter.resonance = clamp(p.filter.resonance, 0, 100);
  p.filter.drive = clamp(p.filter.drive, 0, 100);
  for (const lfo of [p.lfo1, p.lfo2]) {
    lfo.rate = clamp(lfo.rate, 0.01, 20);
    lfo.amount = clamp(lfo.amount, 0, 100);
    if (lfo.target === "Osc C WT Pos" && !p.oscC.enabled) { lfo.target = "Filter Cutoff"; lfo.amount = Math.min(lfo.amount, 8); }
  }
  checks.push("Filter and modulation destinations are coherent");
  if (dry) {
    p.fx.reverb.enabled = false; p.fx.delay.enabled = false;
    p.fx.chorus.enabled = false; p.fx.dimension.enabled = false;
  }
  if (isBass) p.fx.reverb.enabled = false;
  if (p.fx.reverb.enabled) p.fx.reverb.mix = clamp(p.fx.reverb.mix, 0, 32);
  if (p.fx.delay.enabled) p.fx.delay.mix = clamp(p.fx.delay.mix, 0, 28);
  if (p.fx.chorus.enabled) p.fx.chorus.mix = clamp(p.fx.chorus.mix, 0, 24);
  if (p.fx.dimension.enabled && !isBass) p.fx.dimension.mix = clamp(p.fx.dimension.mix, 0, 20);
  checks.push("Effects are restrained and low end stays centered");
  if (!active.length) { p.oscA.enabled = true; p.oscA.level = 60; warnings.push("Re-enabled oscillator A because all tonal sources were disabled."); }
  if (p.oscA.enabled && p.oscA.level < 1) { p.oscA.level = 60; warnings.push("Restored a usable core oscillator level."); }
  checks.push("At least one audible core source is active");
  return { score: Math.max(1, Math.round((checks.length / 5) * 100)), checks, warnings };
}
