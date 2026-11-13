import type { Patch } from "./types";
import { CELESTIAL_KEYS } from "./presets";

function mergeDefaults<T>(defaults: T, value: unknown): T {
  if (Array.isArray(defaults)) return (Array.isArray(value) ? value : defaults) as T;
  if (defaults && typeof defaults === "object") {
    const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(defaults as Record<string, unknown>).map(([k, v]) => [k, mergeDefaults(v, source[k])])) as T;
  }
  return (value === undefined ? defaults : value) as T;
}
export function upgradePatch(value: Patch): Patch {
 const patch = mergeDefaults(CELESTIAL_KEYS, value);
 const saved = value && typeof value === "object" ? value as unknown as Record<string, unknown> : {};
 const savedMacros = Array.isArray(saved.macros) ? saved.macros : [];
 patch.macros = CELESTIAL_KEYS.macros.map((fallback, index) => {
  const macro = savedMacros[index] && typeof savedMacros[index] === "object" ? savedMacros[index] as Partial<typeof fallback> : {};
  return { ...fallback, ...macro };
 });
 const aliases: Record<string,string> = {
  "Warm FM":"Warm Analog / DM-OSCAR",
  "Digital Bell":"FM Piano",
  "Spectral Pad":"Harmonic Series Smooth",
  "Saw Stack":"Analog / Basic Shapes",
  "Soft Square":"Warm Sub",
  "Pulse Width":"PWM / Juno",
  "Glass Partials":"Harmonic Series Smooth",
  "Granular Air":"Dying Sine",
  "Noise Shimmer":"Digital / Basic OPL",
 };
 for (const key of ["oscA","oscB","oscC"] as const) {
  patch[key].wavetable = aliases[patch[key].wavetable] || patch[key].wavetable;
  if (!["Default Shapes","Analog / Basic Shapes","Warm Analog / DM-OSCAR","PWM / Juno","Analog / Basic Mini","Warm Sub","Digital / Basic OPL","Harmonic Series Smooth","Dying Sine","Acid","FM Piano","JF Flute"].includes(patch[key].wavetable)) patch[key].wavetable = "Default Shapes";
 }
 return patch;
}
const KEY = "serumlab.library.v1";
const CURRENT = "serumlab.current.v1";

export function loadLibrary(): Patch[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.map((p) => upgradePatch(p)) : []; } catch { return []; }
}
export function saveLibrary(list: Patch[]) { localStorage.setItem(KEY, JSON.stringify(list)); }
export function upsert(list: Patch[], p: Patch): Patch[] {
  const i = list.findIndex((x) => x.id === p.id);
  if (i === -1) return [p, ...list];
  const next = [...list]; next[i] = p; return next;
}
export function loadCurrent(): Patch | null {
  try { const v = localStorage.getItem(CURRENT); return v ? upgradePatch(JSON.parse(v) as Patch) : null; } catch { return null; }
}
export function saveCurrent(p: Patch) { localStorage.setItem(CURRENT, JSON.stringify(p)); }