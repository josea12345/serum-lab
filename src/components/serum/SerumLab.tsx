import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CELESTIAL_KEYS } from "@/lib/serum/presets";
import { VARIATIONS, applyVariation, type MutatorKey } from "@/lib/serum/variations";
import { EXPORTERS, downloadBlob, fileName } from "@/lib/serum/export";
import { buildNativePreset } from "@/lib/serum/native";
import { loadCurrent, loadLibrary, saveCurrent, saveLibrary, upsert } from "@/lib/serum/storage";
import { getPath, newId, setPath } from "@/lib/serum/util";
import {
  CATEGORIES, DIST_MODES, FILTER_TYPES, LFO_SHAPES, MOD_TARGETS, WAVETABLES, type Category, type Patch,
} from "@/lib/serum/types";
import { Panel, RangeParam, SelectParam, Toggle, type Field } from "./controls";
import { AdsrGraph, OscScope, WaveMark } from "./visuals";

const EXAMPLES = [
  "dreamy, expensive R&B keys with a dark undertone",
  "warm lofi rhodes, dusty and soft",
  "glassy bell pluck, bright and tight",
  "huge dark gritty reese bass",
  "evolving cinematic pad, wide and spacious",
];

const osc = (k: "oscA" | "oscB" | "oscC"): Field[] => [
  { kind: "select", path: `${k}.wavetable`, label: "Wavetable", options: WAVETABLES },
  { kind: "range", path: `${k}.wtPos`, label: "WT Pos", min: 0, max: 100, unit: "%" },
  { kind: "range", path: `${k}.octave`, label: "Octave", min: -4, max: 4 },
  { kind: "range", path: `${k}.semi`, label: "Semi", min: -12, max: 12 },
  { kind: "range", path: `${k}.fine`, label: "Fine", min: -100, max: 100, unit: "ct" },
  { kind: "range", path: `${k}.unison`, label: "Unison", min: 1, max: 16 },
  { kind: "range", path: `${k}.detune`, label: "Detune", min: 0, max: 100, unit: "%" },
  { kind: "range", path: `${k}.blend`, label: "Blend", min: 0, max: 100, unit: "%" },
  { kind: "range", path: `${k}.level`, label: "Level", min: 0, max: 100, unit: "%" },
  { kind: "range", path: `${k}.pan`, label: "Pan", min: -50, max: 50 },
];
const env = (k: string, ext = false): Field[] => [
  { kind: "range", path: `${k}.attack`, label: "Attack", min: 0, max: 10000, step: 1, unit: "ms" },
  { kind: "range", path: `${k}.hold`, label: "Hold", min: 0, max: 2000, unit: "ms" },
  { kind: "range", path: `${k}.decay`, label: "Decay", min: 0, max: 10000, unit: "ms" },
  { kind: "range", path: `${k}.sustain`, label: "Sustain", min: 0, max: 100, unit: "%" },
  { kind: "range", path: `${k}.release`, label: "Release", min: 0, max: 15000, unit: "ms" },
  ...(ext ? ([
    { kind: "select", path: `${k}.target`, label: "Target", options: MOD_TARGETS },
    { kind: "range", path: `${k}.amount`, label: "Amount", min: -100, max: 100, unit: "%" },
  ] as Field[]) : []),
];
const lfo = (k: string): Field[] => [
  { kind: "select", path: `${k}.shape`, label: "Shape", options: LFO_SHAPES },
  { kind: "select", path: `${k}.target`, label: "Target", options: MOD_TARGETS },
  { kind: "range", path: `${k}.rate`, label: "Rate", min: 0.01, max: 20, step: 0.01, unit: "Hz" },
  { kind: "range", path: `${k}.amount`, label: "Amount", min: -100, max: 100, unit: "%" },
];
const FX: { key: keyof Patch["fx"]; title: string; fields: Field[] }[] = [
  { key: "distortion", title: "Distortion", fields: [
    { kind: "select", path: "fx.distortion.mode", label: "Mode", options: DIST_MODES },
    { kind: "range", path: "fx.distortion.drive", label: "Drive", min: 0, max: 100, unit: "%" },
    { kind: "range", path: "fx.distortion.mix", label: "Mix", min: 0, max: 100, unit: "%" }] },
  { key: "chorus", title: "Chorus", fields: [
    { kind: "range", path: "fx.chorus.rate", label: "Rate", min: 0.01, max: 10, step: 0.01, unit: "Hz" },
    { kind: "range", path: "fx.chorus.depth", label: "Depth", min: 0, max: 100, unit: "%" },
    { kind: "range", path: "fx.chorus.mix", label: "Mix", min: 0, max: 100, unit: "%" }] },
  { key: "delay", title: "Delay", fields: [
    { kind: "range", path: "fx.delay.time", label: "Time", min: 1, max: 2000, unit: "ms" },
    { kind: "range", path: "fx.delay.feedback", label: "Feedback", min: 0, max: 100, unit: "%" },
    { kind: "range", path: "fx.delay.mix", label: "Mix", min: 0, max: 100, unit: "%" }] },
  { key: "reverb", title: "Reverb", fields: [
    { kind: "range", path: "fx.reverb.size", label: "Size", min: 0, max: 100, unit: "%" },
    { kind: "range", path: "fx.reverb.decay", label: "Decay", min: 0.1, max: 20, step: 0.1, unit: "s" },
    { kind: "range", path: "fx.reverb.damping", label: "Damping", min: 0, max: 100, unit: "%" },
    { kind: "range", path: "fx.reverb.mix", label: "Mix", min: 0, max: 100, unit: "%" }] },
  { key: "eq", title: "EQ", fields: [
    { kind: "range", path: "fx.eq.lowGain", label: "Low", min: -12, max: 12, step: 0.5, unit: "dB" },
    { kind: "range", path: "fx.eq.highGain", label: "High", min: -12, max: 12, step: 0.5, unit: "dB" }] },
  { key: "compressor", title: "Compressor", fields: [
    { kind: "range", path: "fx.compressor.threshold", label: "Thresh", min: -60, max: 0, unit: "dB" },
    { kind: "range", path: "fx.compressor.ratio", label: "Ratio", min: 1, max: 20, step: 0.1, unit: ":1" },
    { kind: "range", path: "fx.compressor.mix", label: "Mix", min: 0, max: 100, unit: "%" }] },
  { key: "dimension", title: "Dimension", fields: [
    { kind: "range", path: "fx.dimension.size", label: "Size", min: 0, max: 100, unit: "%" },
    { kind: "range", path: "fx.dimension.mix", label: "Mix", min: 0, max: 100, unit: "%" }] },
];

function Fields({ fields, patch, set, disabled, cols = "grid-cols-2 sm:grid-cols-3" }: {
  fields: Field[]; patch: Patch; set: (path: string, v: unknown) => void; disabled?: boolean; cols?: string;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-3", cols)}>
      {fields.map((f) =>
        f.kind === "range" ? (
          <RangeParam key={f.path} label={f.label} min={f.min} max={f.max} step={f.step} unit={f.unit} disabled={disabled}
            value={getPath(patch, f.path) as number} onChange={(v) => set(f.path, v)} />
        ) : f.kind === "select" ? (
          <SelectParam key={f.path} label={f.label} options={f.options} disabled={disabled}
            value={getPath(patch, f.path) as string} onChange={(v) => set(f.path, v)} />
        ) : null,
      )}
    </div>
  );
}

const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:pointer-events-none";

export function SerumLab() {
  const [patch, setPatch] = useState<Patch>(CELESTIAL_KEYS);
  const [baseline, setBaseline] = useState<Patch>(CELESTIAL_KEYS);
  const [library, setLibrary] = useState<Patch[]>([]);
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<Category>("Keys");
  const [status, setStatus] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationIndex, setGenerationIndex] = useState(0);

  useEffect(() => {
    setLibrary(loadLibrary());
    const cur = loadCurrent();
    if (cur?.schema === "serumlab.patch/1") { setPatch(cur); setBaseline(cur); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) saveCurrent(patch); }, [patch, hydrated]);

  const flash = (m: string) => { setStatus(m); window.setTimeout(() => setStatus((s) => (s === m ? "" : s)), 2600); };
  const set = (path: string, v: unknown) => setPatch((p) => ({ ...setPath(p, path, v), updatedAt: new Date().toISOString() }));
  const commitLib = (next: Patch[]) => { setLibrary(next); saveLibrary(next); };

  async function generate(nextDirection = false) {
    const text = prompt.trim();
    if (!text) { flash("Describe a sound first."); return; }
    if (generating) return;
    const iteration = nextDirection ? generationIndex + 1 : 0;
    setGenerating(true); flash(nextDirection ? "Designing a new sound direction…" : "AI is designing your patch…");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(45000), body: JSON.stringify({ prompt: text, category, variation: iteration, previous: nextDirection ? patch : undefined }) });
      const result = await response.json() as { patch?: Patch; error?: string; model?: string; fallback?: boolean };
      if (!response.ok || !result.patch) throw new Error(result.error || "AI generation failed.");
      setPatch(result.patch); setBaseline(result.patch); setCategory(result.patch.category); setGenerationIndex(iteration);
      flash(result.fallback ? "Gemini unavailable · local patch generated: " + result.patch.name : nextDirection ? "New direction: " + result.patch.name : "AI designed " + result.patch.name);
      document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      flash(error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "Generation timed out. Try again—Serum Lab is ready."
        : error instanceof Error ? error.message : "AI generation failed.");
    }
    finally { setGenerating(false); }
  }
  const vary = (k: MutatorKey, label: string) => { setPatch((p) => applyVariation(p, k)); flash(`Applied: ${label}`); };
  const save = () => { commitLib(upsert(library, patch)); setBaseline(patch); flash(`Saved ${patch.name}`); };
  const duplicate = () => {
    const now = new Date().toISOString();
    const copy = { ...structuredClone(patch), id: newId(), name: `${patch.name} COPY`, createdAt: now, updatedAt: now };
    setPatch(copy); setBaseline(copy); commitLib(upsert(library, copy)); flash("Duplicated and saved");
  };
  const reset = () => { setPatch(baseline); flash("Reset to last saved / generated state"); };
  const load = (p: Patch) => { setPatch(p); setBaseline(p); flash(`Loaded ${p.name}`); };
  const remove = (p: Patch) => { if (confirm(`Delete "${p.name}" from your library?`)) commitLib(library.filter((x) => x.id !== p.id)); };
  const renameInLib = (p: Patch) => {
    const n = prompt_(p.name); if (!n) return;
    const r = { ...p, name: n.toUpperCase(), updatedAt: new Date().toISOString() };
    commitLib(upsert(library, r)); if (patch.id === p.id) { setPatch(r); setBaseline(r); }
  };
  const exportJson = () => {
    const ex = EXPORTERS.find((e) => e.id === "json-spec")!;
    downloadBlob(ex.serialize!(patch), fileName(patch, ex.extension));
    flash("Exported JSON patch specification");
  };
  const exportNative = async () => {
    try {
      flash("Building native Serum 2 preset…");
      const blob = await buildNativePreset(patch);
      downloadBlob(blob, fileName(patch, "SerumPreset"));
      flash("Native preset exported — load it in Serum 2 to verify.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Native export failed.");
    }
  };
  const native = EXPORTERS.find((e) => e.id === "serum2-native")!;
  const dirty = JSON.stringify(patch) !== JSON.stringify(baseline);

  return (
    <div className="min-h-screen bg-background bg-grid text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-signal text-primary-foreground shadow-glow"><WaveMark className="h-5 w-5" /></span>
          <span className="font-display text-base font-bold tracking-wide">SERUM LAB</span>
          <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">for Serum 2</span>
        </Link>
        <Link to="/help" className="text-sm text-muted-foreground hover:text-accent">Help</Link>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {/* Prompt */}
        <section aria-labelledby="create-h" className="mx-auto max-w-3xl py-8 text-center sm:py-12">
          <h1 id="create-h" className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Create a <span className="text-signal">sound</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Describe it. Get a structured Serum 2 patch design to refine and recreate.</p>
          <form onSubmit={(e) => { e.preventDefault(); void generate(); }} className="mt-7 rounded-2xl border border-border bg-card p-3 text-left shadow-glow">
            <label htmlFor="prompt" className="sr-only">Describe your sound</label>
            <textarea id="prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void generate(); } }}
              placeholder="dreamy, expensive R&B keys with a dark undertone…"
              className="w-full resize-none bg-transparent px-2 py-1 text-lg placeholder:text-muted-foreground/60 focus:outline-none" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div role="radiogroup" aria-label="Sound category" className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)}
                    className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      category === c ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
                    {c}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={generating} className="inline-flex items-center gap-2 rounded-xl bg-signal px-6 py-2.5 font-display text-sm font-bold tracking-wide text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50">
                <WaveMark className="h-4 w-4" /> {generating ? "THINKING…" : "GENERATE"}
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setPrompt(ex)}
                className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">
                {ex}
              </button>
            ))}
          </div>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            Engine: Serum Lab AI · Gemini · 3-source Serum 2 sound-design engine
          </p>
        </section>

        <p role="status" aria-live="polite" className="sr-only">{status}</p>
        {status && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-accent/40 bg-popover px-4 py-2 text-sm shadow-glow" aria-hidden>{status}</div>}

        {/* Workspace */}
        <div id="workspace" className="grid scroll-mt-4 gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5 min-w-0">
            <section aria-label="Preset" className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <label htmlFor="pname" className="font-mono text-[10px] uppercase tracking-widest text-accent">Preset · {patch.category}{dirty && " · edited"}</label>
                  <input id="pname" value={patch.name} onChange={(e) => set("name", e.target.value.toUpperCase())}
                    className="mt-1 block w-full bg-transparent font-display text-2xl font-bold tracking-wide focus:outline-none sm:text-3xl" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={btn} onClick={() => void generate(true)} disabled={generating || !prompt.trim()}>Generate another direction</button>
                  <button className={btn} onClick={save}>Save</button>
                  <button className={btn} onClick={duplicate}>Duplicate</button>
                  <button className={btn} onClick={reset} disabled={!dirty}>Reset</button>
                </div>
              </div>
              <label htmlFor="pdesc" className="sr-only">Description</label>
              <textarea id="pdesc" rows={2} value={patch.description} onChange={(e) => set("description", e.target.value)}
                className="mt-2 w-full resize-none bg-transparent text-sm text-muted-foreground focus:text-foreground focus:outline-none" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patch.tags.map((t) => <span key={t} className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{t}</span>)}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Variations</p>
                <div className="flex flex-wrap gap-2">
                  {VARIATIONS.map((v) => <button key={v.key} className={btn} onClick={() => vary(v.key, v.label)}>{v.label}</button>)}
                </div>
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              {(["oscA", "oscB", "oscC"] as const).map((k) => (
                <Panel key={k} title={k === "oscA" ? "OSC A" : k === "oscB" ? "OSC B" : "OSC C"} accent="accent"
                  right={<Toggle label={`${k === "oscA" ? "Osc A" : k === "oscB" ? "Osc B" : "Osc C"} enabled`} checked={patch[k].enabled} onChange={(v) => set(`${k}.enabled`, v)} />}>
                  <OscScope osc={patch[k]} />
                  <div className="mt-3"><Fields fields={osc(k)} patch={patch} set={set} disabled={!patch[k].enabled} /></div>
                </Panel>
              ))}
              <Panel title="SUB · NOISE">
                <div className="space-y-3">
                  <div className="flex items-center gap-3"><Toggle label="Sub enabled" checked={patch.sub.enabled} onChange={(v) => set("sub.enabled", v)} /><span className="text-sm">Sub</span></div>
                  <Fields cols="grid-cols-2" patch={patch} set={set} disabled={!patch.sub.enabled} fields={[
                    { kind: "range", path: "sub.octave", label: "Octave", min: -4, max: 4 },
                    { kind: "range", path: "sub.level", label: "Level", min: 0, max: 100, unit: "%" }]} />
                  <div className="flex items-center gap-3"><Toggle label="Noise enabled" checked={patch.noise.enabled} onChange={(v) => set("noise.enabled", v)} /><span className="text-sm">Noise</span></div>
                  <Fields cols="grid-cols-2" patch={patch} set={set} disabled={!patch.noise.enabled} fields={[
                    { kind: "range", path: "noise.level", label: "Level", min: 0, max: 100, unit: "%" }]} />
                </div>
              </Panel>
              <Panel title="FILTER" right={<Toggle label="Filter enabled" checked={patch.filter.enabled} onChange={(v) => set("filter.enabled", v)} />}>
                <Fields cols="grid-cols-2" patch={patch} set={set} disabled={!patch.filter.enabled} fields={[
                  { kind: "select", path: "filter.type", label: "Type", options: FILTER_TYPES },
                  { kind: "range", path: "filter.cutoff", label: "Cutoff", min: 20, max: 20000, step: 10, unit: "Hz" },
                  { kind: "range", path: "filter.resonance", label: "Resonance", min: 0, max: 100, unit: "%" },
                  { kind: "range", path: "filter.drive", label: "Drive", min: 0, max: 100, unit: "%" },
                  { kind: "range", path: "filter.mix", label: "Mix", min: 0, max: 100, unit: "%" }]} />
              </Panel>
              <Panel title="AMP ENVELOPE">
                <AdsrGraph env={patch.ampEnv} />
                <div className="mt-3"><Fields patch={patch} set={set} fields={env("ampEnv")} /></div>
              </Panel>
              <Panel title="ENV 2 · MOD">
                <AdsrGraph env={patch.env2} />
                <div className="mt-3"><Fields patch={patch} set={set} fields={env("env2", true)} /></div>
              </Panel>
              <Panel title="LFO 1" accent="accent"><Fields cols="grid-cols-2" patch={patch} set={set} fields={lfo("lfo1")} /></Panel>
              <Panel title="LFO 2" accent="accent"><Fields cols="grid-cols-2" patch={patch} set={set} fields={lfo("lfo2")} /></Panel>
            </div>

            <Panel title="FX CHAIN">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {FX.map((fx, i) => {
                  const on = patch.fx[fx.key].enabled;
                  return (
                    <div key={fx.key} className={cn("rounded-lg border p-3 transition-opacity", on ? "border-border bg-card" : "border-border/50 opacity-60")}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold"><span className="mr-1.5 font-mono text-[10px] text-muted-foreground">{i + 1}</span>{fx.title}</span>
                        <Toggle label={`${fx.title} enabled`} checked={on} onChange={(v) => set(`fx.${fx.key}.enabled`, v)} />
                      </div>
                      <Fields cols="grid-cols-2" patch={patch} set={set} disabled={!on} fields={fx.fields} />
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="GLOBAL">
              <Fields patch={patch} set={set} fields={[
                { kind: "range", path: "global.voices", label: "Voices", min: 1, max: 32 },
                { kind: "range", path: "global.portamento", label: "Porta", min: 0, max: 2000, unit: "ms" },
                { kind: "range", path: "global.master", label: "Master", min: 0, max: 100, unit: "%" }]} />
            </Panel>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            <Panel title="EXPORT" accent="accent">
              <button onClick={exportJson} className="w-full rounded-lg bg-signal px-3 py-2.5 text-sm font-bold text-primary-foreground shadow-glow">
                Export JSON patch spec (.json)
              </button>
              <p className="mt-2 text-xs text-muted-foreground">All parameters and metadata. Not a Serum file — use it to recreate the patch in Serum 2.</p>
              <div className="mt-3 rounded-lg border border-dashed border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{native.label}</span>
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">BETA</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{native.unavailableReason}</p>
                <button onClick={() => void exportNative()} disabled={!native.available} className={cn(btn, "mt-2 w-full")}>Export .SerumPreset</button>
              </div>
            </Panel>
            <Panel title="LIBRARY" right={<span className="font-mono text-[10px] text-muted-foreground">{library.length} saved</span>}>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => load(CELESTIAL_KEYS)} className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary">
                    CELESTIAL KEYS <span className="text-xs text-muted-foreground">· starter</span>
                  </button>
                </li>
                {library.map((p) => (
                  <li key={p.id} className={cn("group flex items-center gap-1 rounded-md", patch.id === p.id && "bg-secondary")}>
                    <button onClick={() => load(p)} className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm">
                      {p.name} <span className="text-xs text-muted-foreground">· {p.category}</span>
                    </button>
                    <button onClick={() => renameInLib(p)} aria-label={`Rename ${p.name}`} className="px-1.5 text-xs text-muted-foreground hover:text-accent">Rename</button>
                    <button onClick={() => remove(p)} aria-label={`Delete ${p.name}`} className="px-1.5 text-xs text-muted-foreground hover:text-destructive">✕</button>
                  </li>
                ))}
              </ul>
              {library.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Saved presets stay in this browser.</p>}
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}

function prompt_(current: string) { return window.prompt("Rename preset", current)?.trim(); }