import { categoryBase } from "./presets";
import { CATEGORIES, type Category, type Patch } from "./types";
import { MUTATORS, type MutatorKey } from "./variations";
import { clamp, hash, newId, round } from "./util";

export interface GenerateRequest { prompt: string; category: Category }
/** Any generator (keyword engine today, an AI model later) implements this. */
export interface PatchGenerator {
  id: string;
  label: string;
  usesAI: boolean;
  generate(req: GenerateRequest): Promise<Patch>;
}

const RULES: { words: string[]; tag: string; mut: MutatorKey }[] = [
  { words: ["dark", "moody", "shadow", "night", "deep", "murky"], tag: "Dark", mut: "darker" },
  { words: ["bright", "shiny", "crisp", "airy", "sparkl", "glassy", "glass"], tag: "Bright", mut: "brighter" },
  { words: ["wide", "stereo", "huge", "lush", "expensive", "big"], tag: "Wide", mut: "wider" },
  { words: ["soft", "gentle", "mellow", "smooth", "silky", "tender"], tag: "Soft", mut: "softer" },
  { words: ["bell", "chime", "glock", "mallet", "celest"], tag: "Bell", mut: "bell" },
  { words: ["warm", "analog", "vintage", "rhodes", "r&b", "rnb", "soul"], tag: "Warm", mut: "warmer" },
  { words: ["gritty", "dirty", "aggressive", "distorted", "growl", "harsh"], tag: "Gritty", mut: "grittier" },
  { words: ["dreamy", "spacious", "ambient", "ethereal", "cinematic", "space"], tag: "Spacious", mut: "spacious" },
  { words: ["tight", "short", "punchy", "staccato", "snappy"], tag: "Tight", mut: "tighter" },
  { words: ["lofi", "lo-fi", "tape", "dusty", "worn", "wobbly"], tag: "Lo-fi", mut: "lofi" },
  { words: ["evolving", "moving", "morph", "shifting", "breathing"], tag: "Evolving", mut: "evolving" },
  { words: ["wobble", "dubstep", "wub"], tag: "Wobble", mut: "wobble" },
];

const CATEGORY_WORDS: Record<Category, string[]> = {
  Keys: ["keys", "piano", "rhodes", "epiano", "chord", "organ"],
  Bass: ["bass", "808", "sub", "reese"],
  Lead: ["lead", "solo", "melody line", "topline"],
  Pluck: ["pluck", "plucky", "harp", "pizz"],
  Pad: ["pad", "strings", "choir", "swell"],
  Texture: ["texture", "atmosphere", "drone", "noise", "foley", "soundscape"],
};

const ADJ = ["VELVET", "OBSIDIAN", "LUMEN", "NOCTURNE", "AURORA", "HALO", "ECLIPSE", "PRISM", "NEON", "ONYX", "SATIN", "ORBIT", "MIRAGE", "QUARTZ"];
const NOUN: Record<Category, string[]> = {
  Keys: ["KEYS", "CHORDS", "RHODES", "TINES"],
  Bass: ["BASS", "SUB", "LOW END", "REESE"],
  Lead: ["LEAD", "LINE", "SIREN", "VOICE"],
  Pluck: ["PLUCK", "DROPS", "SHARDS", "STRINGS"],
  Pad: ["PAD", "CLOUD", "HORIZON", "BLOOM"],
  Texture: ["TEXTURE", "DUST", "ATMOS", "FIELD"],
};

type Intent = {
  role: string;
  envelope: string;
  tone: string;
  motion: string;
  width: string;
  density: string;
  space: string;
};
const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

/** A transparent, deterministic interpretation layer. Each dimension is resolved independently. */
export function interpretPrompt(prompt: string, category: Category): Intent {
  const t = prompt.toLowerCase();
  const role = has(t, ["chord", "voicing", "comping", "rhodes", "piano"]) ? "Chord / harmonic bed"
    : has(t, ["808", "sub", "reese", "bass"]) ? "Low-frequency foundation"
    : has(t, ["pluck", "pluck", "mallet", "pizz", "arpeggio", "arp"]) ? "Plucked transient"
    : has(t, ["bell", "chime", "glock", "tine"]) ? "Bell-like accent"
    : has(t, ["lead", "solo", "topline", "melody"]) ? "Melodic lead"
    : has(t, ["pad", "swell", "drone", "atmosphere"]) ? "Sustained atmosphere"
    : category === "Bass" ? "Low-frequency foundation"
    : category === "Pad" || category === "Texture" ? "Sustained atmosphere"
    : category === "Pluck" ? "Plucked transient"
    : category === "Lead" ? "Melodic lead" : "Harmonic instrument";

  const envelope = has(t, ["staccato", "short", "tight", "punchy", "snappy", "plucky", "pluck"]) ? "Short / percussive"
    : has(t, ["swell", "slow attack", "fade in", "rising", "bloom"]) ? "Slow swell"
    : has(t, ["sustain", "held", "long note", "legato", "smooth"]) ? "Sustained"
    : has(t, ["pluck", "bell", "chime", "mallet", "pizz"]) ? "Fast attack / natural decay"
    : category === "Pad" || category === "Texture" ? "Slow swell" : "Balanced / playable";

  const tone = has(t, ["dark", "warm", "round", "soft", "mellow", "velvet"]) ? "Warm / dark"
    : has(t, ["bright", "glassy", "sparkle", "shimmer", "crisp", "airy"]) ? "Bright / airy"
    : has(t, ["dirty", "gritty", "aggressive", "distorted", "harsh"]) ? "Saturated / harmonically rich"
    : "Balanced harmonic tone";
  const motion = has(t, ["evolving", "moving", "morph", "shifting", "breathing", "wobble", "pulsing", "tremolo"]) ? "Animated / evolving"
    : has(t, ["static", "steady", "stable", "clean"]) ? "Stable / restrained" : "Subtle movement";
  const width = has(t, ["mono", "centered", "narrow", "focused", "dry"]) ? "Focused / narrow"
    : has(t, ["wide", "stereo", "huge", "lush", "expansive", "massive"]) ? "Wide stereo" : "Moderate stereo";
  const density = has(t, ["layered", "thick", "dense", "huge", "massive", "stacked", "complex"]) ? "Dense / layered"
    : has(t, ["simple", "minimal", "thin", "sparse", "pure"]) ? "Sparse / exposed" : "Moderate";
  const space = has(t, ["dry", "close", "intimate", "upfront", "tight"]) ? "Close / dry"
    : has(t, ["spacious", "ambient", "cinematic", "reverb", "echo", "distant", "dreamy"]) ? "Long / spacious" : "Controlled room";
  return { role, envelope, tone, motion, width, density, space };
}

export function detectCategory(prompt: string, fallback: Category): Category {
  const t = prompt.toLowerCase();
  for (const c of CATEGORIES) if (CATEGORY_WORDS[c].some((w) => t.includes(w))) return c;
  return fallback;
}

function shapePatch(p: Patch, intent: Intent, text: string) {
  // Envelope / articulation
  if (intent.envelope === "Short / percussive" || intent.envelope === "Fast attack / natural decay") {
    p.ampEnv.attack = Math.min(p.ampEnv.attack, 3);
    p.ampEnv.decay = Math.min(p.ampEnv.decay, intent.envelope.startsWith("Fast") ? 900 : 500);
    p.ampEnv.sustain = intent.envelope.startsWith("Fast") ? 8 : Math.min(p.ampEnv.sustain, 25);
    p.ampEnv.release = Math.min(p.ampEnv.release, 500);
  } else if (intent.envelope === "Slow swell") {
    p.ampEnv.attack = Math.max(p.ampEnv.attack, 850);
    p.ampEnv.release = Math.max(p.ampEnv.release, 2200);
    p.ampEnv.sustain = Math.max(p.ampEnv.sustain, 65);
  } else if (intent.envelope === "Sustained") {
    p.ampEnv.attack = Math.max(p.ampEnv.attack, 80);
    p.ampEnv.sustain = Math.max(p.ampEnv.sustain, 78);
    p.ampEnv.release = Math.max(p.ampEnv.release, 900);
  }

  // Spectral character
  if (intent.tone === "Warm / dark") {
    p.filter.cutoff = Math.min(p.filter.cutoff, 2600);
    p.filter.drive = clamp(p.filter.drive + 5, 0, 100);
    p.fx.eq.highGain = clamp(p.fx.eq.highGain - 2, -12, 12);
  } else if (intent.tone === "Bright / airy") {
    p.filter.cutoff = Math.max(p.filter.cutoff, 5200);
    p.fx.eq.highGain = clamp(p.fx.eq.highGain + 2, -12, 12);
  } else if (intent.tone === "Saturated / harmonically rich") {
    p.filter.drive = clamp(p.filter.drive + 18, 0, 100);
    p.fx.distortion.enabled = true;
    p.fx.distortion.drive = clamp(p.fx.distortion.drive + 15, 0, 100);
  }

  // Motion and modulation
  if (intent.motion === "Animated / evolving") {
    p.lfo1.target = has(text, ["pitch", "detune", "vibrato"]) ? "Osc A Fine" : "Osc A WT Pos";
    p.lfo1.amount = Math.max(p.lfo1.amount, 22);
    p.lfo1.rate = has(text, ["slow", "gradual", "breathing"]) ? 0.18 : Math.max(p.lfo1.rate, 0.7);
    p.lfo2.shape = "Random S&H";
    p.lfo2.target = "Filter Cutoff";
    p.lfo2.amount = Math.max(p.lfo2.amount, 8);
  } else if (intent.motion === "Stable / restrained") {
    p.lfo1.amount = Math.min(p.lfo1.amount, 5);
    p.lfo2.amount = Math.min(p.lfo2.amount, 3);
  }

  // Stereo image and layer density
  if (intent.width === "Wide stereo") {
    p.oscA.unison = clamp(Math.max(p.oscA.unison, 5), 1, 16);
    p.oscA.detune = Math.max(p.oscA.detune, 16);
    p.oscA.blend = Math.max(p.oscA.blend, 55);
    p.fx.chorus.enabled = true;
    p.fx.chorus.mix = Math.max(p.fx.chorus.mix, 22);
    p.fx.dimension.enabled = true;
    p.fx.dimension.mix = Math.max(p.fx.dimension.mix, 24);
  } else if (intent.width === "Focused / narrow") {
    p.oscA.unison = Math.min(p.oscA.unison, 2);
    p.oscB.unison = Math.min(p.oscB.unison, 2);
    p.fx.dimension.enabled = false;
    p.fx.chorus.mix = Math.min(p.fx.chorus.mix, 10);
  }
  if (intent.density === "Sparse / exposed") {
    p.oscB.enabled = false;
    p.noise.enabled = false;
    p.oscA.unison = Math.min(p.oscA.unison, 2);
  } else if (intent.density === "Dense / layered") {
    p.oscB.enabled = true;
    p.oscB.level = Math.max(p.oscB.level, 38);
    p.oscA.unison = clamp(Math.max(p.oscA.unison, 4), 1, 16);
  }

  // Spatial treatment
  if (intent.space === "Long / spacious") {
    p.fx.reverb.enabled = true;
    p.fx.reverb.size = Math.max(p.fx.reverb.size, 75);
    p.fx.reverb.decay = Math.max(p.fx.reverb.decay, 4.5);
    p.fx.reverb.mix = Math.max(p.fx.reverb.mix, 28);
    p.fx.delay.enabled = true;
    p.ampEnv.release = Math.max(p.ampEnv.release, 900);
  } else if (intent.space === "Close / dry") {
    p.fx.reverb.mix = Math.min(p.fx.reverb.mix, 8);
    p.fx.delay.mix = Math.min(p.fx.delay.mix, 6);
    p.fx.dimension.enabled = false;
  }
}

export function generatePatch(req: GenerateRequest, now = new Date().toISOString(), id = newId()): Patch {
  const text = req.prompt.toLowerCase();
  const category = detectCategory(text, req.category);
  const p = categoryBase(category);
  const matched = RULES.filter((r) => r.words.some((w) => text.includes(w)));
  matched.forEach((r) => MUTATORS[r.mut](p));
  const intent = interpretPrompt(req.prompt, category);
  shapePatch(p, intent, text);

  // Make the bass path mono and focused unless the user explicitly asks for width.
  if (category === "Bass" && intent.width !== "Wide stereo") {
    p.global.voices = 1;
    p.oscA.unison = 1;
    p.oscB.unison = 1;
    p.fx.dimension.enabled = false;
  }
  p.filter.cutoff = round(clamp(p.filter.cutoff, 20, 20000), 10);
  p.id = id;
  const h = hash(text + category);
  p.name = `${ADJ[h % ADJ.length]} ${NOUN[category][(h >> 4) % NOUN[category].length]}`;
  p.prompt = req.prompt.trim();
  p.tags = [...new Set([category, ...matched.map((r) => r.tag), intent.role.split(" ")[0], intent.envelope.split(" ")[0]])];
  p.description = `${intent.role}. ${intent.envelope} envelope; ${intent.tone.toLowerCase()} tone; ${intent.motion.toLowerCase()}; ${intent.width.toLowerCase()} image; ${intent.density.toLowerCase()} structure; ${intent.space.toLowerCase()} ambience. Suggested source: ${p.oscA.wavetable} (A) + ${p.oscB.enabled ? p.oscB.wavetable + " (B)" : "OSC A solo"}. ${p.filter.type} filter at ${p.filter.cutoff} Hz.`;
  p.createdAt = now;
  p.updatedAt = now;
  return p;
}

export const keywordGenerator: PatchGenerator = {
  id: "intent-engine-v2",
  label: "Sound-intent engine",
  usesAI: false,
  generate: async (req) => generatePatch(req),
};
// To connect an AI model later: implement PatchGenerator with a server function that returns a Patch JSON, and swap it in.
export const activeGenerator: PatchGenerator = keywordGenerator;
