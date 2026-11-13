import { categoryBase } from "./presets";
import { CATEGORIES, type Category, type Patch } from "./types";
import { MUTATORS, type MutatorKey } from "./variations";
import { hash, newId } from "./util";

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

export function detectCategory(prompt: string, fallback: Category): Category {
  const t = prompt.toLowerCase();
  for (const c of CATEGORIES) if (CATEGORY_WORDS[c].some((w) => t.includes(w))) return c;
  return fallback;
}

export function generatePatch(req: GenerateRequest, now = new Date().toISOString(), id = newId()): Patch {
  const text = req.prompt.toLowerCase();
  const category = detectCategory(text, req.category);
  const p = categoryBase(category);
  const matched = RULES.filter((r) => r.words.some((w) => text.includes(w)));
  matched.forEach((r) => MUTATORS[r.mut](p));
  const h = hash(text + category);
  p.id = id;
  p.name = `${ADJ[h % ADJ.length]} ${NOUN[category][(h >> 4) % NOUN[category].length]}`;
  p.prompt = req.prompt.trim();
  p.tags = [category, ...matched.map((r) => r.tag)];
  const traits = matched.length ? matched.map((r) => r.tag.toLowerCase()).join(", ") : "balanced, neutral";
  p.description = `${category} patch interpreted from your prompt — ${traits}. Built on ${p.oscA.wavetable} (A) and ${p.oscB.wavetable} (B) through a ${p.filter.type} filter at ${p.filter.cutoff} Hz.`;
  p.createdAt = now;
  p.updatedAt = now;
  return p;
}

export const keywordGenerator: PatchGenerator = {
  id: "keyword-v1",
  label: "Keyword engine",
  usesAI: false,
  generate: async (req) => generatePatch(req),
};
// To connect an AI model later: implement PatchGenerator with a server function that returns a Patch JSON, and swap it in.
export const activeGenerator: PatchGenerator = keywordGenerator;