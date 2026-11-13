import { createFileRoute } from "@tanstack/react-router";
import { categoryBase } from "@/lib/serum/presets";
import { CATEGORIES, type Category, type Patch } from "@/lib/serum/types";
function merge(base: any, incoming: any): any {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (base && typeof base === "object") { const src = incoming && typeof incoming === "object" ? incoming : {}; return Object.fromEntries(Object.entries(base).map(([k,v]) => [k, merge(v, src[k])])); }
  return incoming === undefined ? base : incoming;
}
const clamp = (v: unknown, lo: number, hi: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
export const Route = createFileRoute("/api/generate")({ server: { handlers: {
  POST: async ({ request }) => {
    const key = process.env.AI_GATEWAY_API_KEY;
    if (!key) return Response.json({ error: "AI is not connected. Add AI_GATEWAY_API_KEY to the Serum Lab Vercel project." }, { status: 503 });
    try {
      const body = await request.json() as { prompt?: string; category?: Category; variation?: number; previous?: Partial<Patch> };
      const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1200) : "";
      const category = CATEGORIES.includes(body.category as Category) ? body.category as Category : "Keys";
      const variation = Math.max(0, Math.min(20, Number(body.variation) || 0));
      if (!prompt) return Response.json({ error: "Describe the sound first." }, { status: 400 });
      const base = categoryBase(category);
      const previous = body.previous ? JSON.stringify(body.previous).slice(0, 5000) : "None";
      const system = "You are Serum Lab, an expert Serum 2 sound designer. Translate musical references into technically coherent, playable Serum 2 patches. Artist references describe broad musical traits only; do not claim to copy exact recordings or proprietary presets. Reason about oscillator source and harmonics, articulation, filter, modulation, stereo image and effects as one coherent instrument. Return ONLY one complete JSON patch object matching the supplied schema. Use valid schema fields and enum values. Envelope times are milliseconds; filter cutoff Hz; LFO rate Hz. Keep settings mix-ready and plausible. Distinctly design the sound rather than merely describing it.";
      const direction = variation === 0 ? "Create the strongest first interpretation." : "Creative iteration " + (variation + 1) + ": create a genuinely different sound-design direction, not a small random tweak. Change the synthesis architecture, source character, envelope strategy, modulation and/or effects while preserving the brief. Previous patch to avoid repeating: " + previous;
      const user = "Brief: " + prompt + "\nCategory: " + category + "\nDirection: " + direction + "\n\nComplete output structure and valid enum examples: " + JSON.stringify(base) + "\n\nReturn a complete patch object. Give it a distinctive uppercase preset name, meaningful description and tags. Keep prompt equal to the brief.";
      const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ model: "anthropic/claude-sonnet-4.6", temperature: variation ? 0.95 : 0.75, max_tokens: 5000, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }) });
      if (!response.ok) return Response.json({ error: "AI Gateway returned " + response.status + ": " + (await response.text()).slice(0, 300) }, { status: 502 });
      const data = await response.json() as any;
      const raw = data.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("The AI returned an empty patch.");
      const parsed = JSON.parse(raw) as Partial<Patch>;
      const patch = merge(base, parsed) as Patch;
      const now = new Date().toISOString();
      patch.schema = "serumlab.patch/1"; patch.id = crypto.randomUUID(); patch.name = (parsed.name || "SERUM LAB PATCH").slice(0, 48).toUpperCase();
      patch.category = CATEGORIES.includes(parsed.category as Category) ? parsed.category as Category : category;
      patch.prompt = prompt; patch.description = typeof parsed.description === "string" ? parsed.description.slice(0, 1000) : "AI-designed Serum 2 patch.";
      patch.tags = Array.isArray(parsed.tags) ? parsed.tags.filter((x): x is string => typeof x === "string").slice(0, 12) : [patch.category];
      patch.createdAt = now; patch.updatedAt = now;
      patch.oscA.level = clamp(patch.oscA.level, 0, 100, base.oscA.level); patch.oscB.level = clamp(patch.oscB.level, 0, 100, base.oscB.level);
      patch.oscA.unison = clamp(patch.oscA.unison, 1, 16, 1); patch.oscB.unison = clamp(patch.oscB.unison, 1, 16, 1);
      patch.filter.cutoff = clamp(patch.filter.cutoff, 20, 20000, base.filter.cutoff); patch.filter.resonance = clamp(patch.filter.resonance, 0, 100, base.filter.resonance);
      patch.ampEnv.attack = clamp(patch.ampEnv.attack, 0, 10000, 5); patch.ampEnv.decay = clamp(patch.ampEnv.decay, 0, 10000, 500); patch.ampEnv.sustain = clamp(patch.ampEnv.sustain, 0, 100, 50); patch.ampEnv.release = clamp(patch.ampEnv.release, 0, 15000, 300);
      return Response.json({ patch, model: "anthropic/claude-sonnet-4.6" });
    } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Patch generation failed." }, { status: 500 }); }
  }
} } });