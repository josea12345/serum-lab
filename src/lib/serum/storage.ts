import type { Patch } from "./types";
const KEY = "serumlab.library.v1";
const CURRENT = "serumlab.current.v1";

export function loadLibrary(): Patch[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function saveLibrary(list: Patch[]) { localStorage.setItem(KEY, JSON.stringify(list)); }
export function upsert(list: Patch[], p: Patch): Patch[] {
  const i = list.findIndex((x) => x.id === p.id);
  if (i === -1) return [p, ...list];
  const next = [...list]; next[i] = p; return next;
}
export function loadCurrent(): Patch | null {
  try { const v = localStorage.getItem(CURRENT); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function saveCurrent(p: Patch) { localStorage.setItem(CURRENT, JSON.stringify(p)); }