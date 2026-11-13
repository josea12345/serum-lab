import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — Serum Lab" },
      { name: "description", content: "How Serum Lab creates Serum 2 patch specifications, and why native preset export is not yet available." },
      { property: "og:title", content: "Serum Lab Help" },
      { property: "og:description", content: "What Serum Lab generates and how export works." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

const ITEMS: [string, string][] = [
  ["What Serum Lab makes", "Serum Lab creates patch specifications for Xfer Serum 2: a structured list of oscillator, filter, envelope, LFO and FX settings you recreate in Serum 2 by hand. Wavetable names are descriptive suggestions — pick the closest table in your library."],
  ["How generation works", "Your prompt is read by a deterministic keyword engine (e.g. dark, bright, wide, bell, warm, lofi, spacious). Words like 'bass' or 'pad' also switch the category. No AI model is connected yet; the same prompt always gives the same patch."],
  ["Editing", "Every control is editable with mouse, touch or keyboard (Tab to focus, arrow keys to adjust, or type an exact value). Variation buttons nudge related parameters together. Reset returns to the last saved or generated state."],
  ["Saving", "Save, Duplicate, Rename and Delete keep presets in this browser only. Clearing site data removes them — export JSON to keep a backup."],
  ["Export", "Native .SerumPreset export depends on a verified Serum 2 serialization, which isn't available yet, so it's disabled. Instead you can export a clearly labeled JSON patch specification containing every parameter value and metadata. Serum Lab never renames JSON to .SerumPreset and has not been tested inside Serum."],
];

function Help() {
  return (
    <div className="min-h-screen bg-background bg-grid text-foreground">
      <main className="mx-auto max-w-2xl px-5 py-12">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to Serum Lab</Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Help</h1>
        <div className="mt-8 space-y-6">
          {ITEMS.map(([h, b]) => (
            <section key={h} className="rounded-xl border border-border bg-panel p-5">
              <h2 className="font-display text-sm tracking-wider text-primary">{h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}