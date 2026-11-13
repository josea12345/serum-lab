import { createFileRoute } from "@tanstack/react-router";
import { categoryBase } from "@/lib/serum/presets";
import { SERUM_2_DESIGN_BIBLE } from "@/lib/serum/knowledge";
import { CATEGORIES, type Category, type Patch } from "@/lib/serum/types";
function merge(base: any, incoming: any): any {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (base && typeof base === "object") {
    const src = incoming && typeof incoming === "object" ? incoming : {};
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, merge(v, src[k])]));
  }
  return incoming === undefined ? base : incoming;
}
const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
export const Route = createFileRoute("/api/generate")({
  server: { handlers: {
    POST: async ({ request }) => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return Response.json({ error: "Free AI is not connected yet. Add GEMINI_API_KEY to the Serum Lab Vercel project." }, { status: 503 });
      try {
        const body = await request.json() as { prompt?: string; category?: Category; variation?: number; previous?: Partial<Patch> };
        const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1200) : "";
        const category = CATEGORIES.includes(body.category as Category) ? body.category as Category : "Keys";
        const variation = Math.max(0, Math.min(20, Number(body.variation) || 0));
        if (!prompt) return Response.json({ error: "Describe the sound first." }, { status: 400 });
        const base = categoryBase(category);
        const previous = body.previous ? JSON.stringify(body.previous).slice(0, 5000) : "None";
        const system = "You are Serum Lab, a senior Serum 2 synthesist. Apply the following technical design curriculum as operating knowledge, not as optional inspiration. Return ONLY one complete JSON patch object matching the supplied schema. Use only schema fields and enum values. Envelope times are milliseconds; filter cutoff Hz; LFO rate Hz. Keep settings playable, mix-aware, and internally coherent. Never claim unsupported native preset functionality.\\n\\n" + SERUM_2_DESIGN_BIBLE;
        const direction = variation === 0 ? "Create the strongest first interpretation." : "Creative iteration " + (variation + 1) + ": create a genuinely different sound-design direction, not a small random tweak. Change the synthesis architecture, source character, envelope strategy, modulation and/or effects while preserving the brief. Previous patch to avoid repeating: " + previous;
        const user = "Brief: " + prompt + "\nCategory: " + category + "\nDirection: " + direction + "\n\nComplete output structure and valid enum examples: " + JSON.stringify(base) + "\n\nReturn a complete patch object. Give it a distinctive uppercase preset name, meaningful description and tags. Keep prompt equal to the brief.";
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: variation ? 0.95 : 0.75, maxOutputTokens: 5000, responseMimeType: "application/json" }
          })
        });
        if (!response.ok) {
          const detail = (await response.text()).slice(0, 500);
          const status = response.status === 429 ? 429 : response.status === 403 ? 503 : 502;
          return Response.json({ error: response.status === 429 ? "Gemini's free usage limit has been reached for now. Please try again after the quota resets." : "Gemini API returned " + response.status + ": " + detail }, { status });
        }
        const data = await response.json() as any;
        const raw = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
        if (typeof raw !== "string" || !raw.trim()) throw new Error("Gemini returned an empty patch. Try generating again.");
        const parsed = JSON.parse(raw) as Partial<Patch>;
        const patch = merge(base, parsed) as Patch;
        const now = new Date().toISOString();
        patch.schema = "serumlab.patch/1"; patch.id = crypto.randomUUID();
        patch.name = (parsed.name || "SERUM LAB PATCH").slice(0, 48).toUpperCase();
        patch.category = CATEGORIES.includes(parsed.category as Category) ? parsed.category as Category : category;
        patch.prompt = prompt;
        patch.description = typeof parsed.description === "string" ? parsed.description.slice(0, 1000) : "AI-designed Serum 2 patch.";
        patch.tags = Array.isArray(parsed.tags) ? parsed.tags.filter((x): x is string => typeof x === "string").slice(0, 12) : [patch.category];
        patch.createdAt = now; patch.updatedAt = now;
        patch.oscA.level = clamp(patch.oscA.level, 0, 100, base.oscA.level);
        patch.oscB.level = clamp(patch.oscB.level, 0, 100, base.oscB.level);
        patch.oscA.unison = clamp(patch.oscA.unison, 1, 16, 1);
        patch.oscB.unison = clamp(patch.oscB.unison, 1, 16, 1);
        patch.filter.cutoff = clamp(patch.filter.cutoff, 20, 20000, base.filter.cutoff);
        patch.filter.resonance = clamp(patch.filter.resonance, 0, 100, base.filter.resonance);
        patch.ampEnv.attack = clamp(patch.ampEnv.attack, 0, 10000, 5);
        patch.ampEnv.decay = clamp(patch.ampEnv.decay, 0, 10000, 500);
        patch.ampEnv.sustain = clamp(patch.ampEnv.sustain, 0, 100, 50);
        patch.ampEnv.release = clamp(patch.ampEnv.release, 0, 15000, 300);
        return Response.json({ patch, model: "gemini-3.8-flash (free tier)" });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Patch generation failed." }, { status: 500 });
      }
    }
  } }
});
