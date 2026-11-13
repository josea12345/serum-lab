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
export function upgradePatch(value: Patch): Patch { return mergeDefaults(CELESTIAL_KEYS, value); }
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