import { createFileRoute } from "@tanstack/react-router";
import { categoryBase } from "@/lib/serum/presets";
import { generatePatch } from "@/lib/serum/generator";
import { SERUM_2_DESIGN_BIBLE } from "@/lib/serum/knowledge";
import { CATEGORIES, DIST_MODES, FILTER_TYPES, LFO_SHAPES, MOD_TARGETS, WAVETABLES, WARP_MODES, type Category, type Patch } from "@/lib/serum/types";
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

const OFFLINE_DIRECTIONS = [
  "FM bell transient layered over a warm sustained body",
  "subtractive filtered oscillator with a rhythmic pluck envelope",
  "wide upper harmonics over a centered dry core",
  "mono analog-style voice with controlled saturation and glide",
  "soft evolving pad with restrained slow modulation",
  "bright transient over a dark rounded tonal foundation",
];
function localFallback(prompt: string, category: Category, variation: number) {
  const direction = variation > 0 ? OFFLINE_DIRECTIONS[(variation - 1) % OFFLINE_DIRECTIONS.length] : "";
  const patch = generatePatch({ prompt: [prompt, direction].filter(Boolean).join(". "), category, variation });
  patch.prompt = prompt;
  patch.description = (patch.description + " Local sound-intent fallback: generated without Gemini; advanced AI interpretation is temporarily unavailable.").slice(0, 1000);
  return Response.json({ patch, model: "local sound-intent engine (offline fallback)", fallback: true });
}
export const Route = createFileRoute("/api/generate")({
  server: { handlers: {
    POST: async ({ request }) => {
      const key = process.env.GEMINI_API_KEY;
      try {
        const body = await request.json() as { prompt?: string; category?: Category; variation?: number; previous?: Partial<Patch> };
        const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1200) : "";
        const category = CATEGORIES.includes(body.category as Category) ? body.category as Category : "Keys";
        const variation = Math.max(0, Math.min(20, Number(body.variation) || 0));
        if (!prompt) return Response.json({ error: "Describe the sound first." }, { status: 400 });
        const base = categoryBase(category);
        if (!key) return localFallback(prompt, category, variation);
        const previous = body.previous ? JSON.stringify(body.previous).slice(0, 5000) : "None";
        const system = "You are a world-class electronic music sound designer and senior Serum 2 programmer. Your output must sound like a finished, intentional instrument from a professional record, not a generic preset demo. Design the patch in this order: source architecture and spectral identity; transient/body balance; note articulation; harmonic movement; stereo placement; then effects. Every oscillator must have a distinct audible role. Avoid defaulting to saw stacks, excessive unison, excessive reverb, chorus-plus-dimension stacking, or turning on every effect. Keep low frequencies mono and stable, preserve transient definition, leave headroom, and use the minimum processing needed. Choose envelope and modulation values that fit the musical role and note range. Be specific, tasteful, and decisive. Variation requests must change the underlying sound concept and layer roles, not merely tweak parameter values. Use only schema fields and enum values; do not invent factory wavetable names or unsupported engines. Return ONLY one complete JSON patch object matching the supplied schema. Envelope times are milliseconds; filter cutoff Hz; LFO rate Hz.\\n\\n" + SERUM_2_DESIGN_BIBLE;
        const direction = variation === 0 ? "Create the strongest, most musically useful interpretation. Do not over-layer or over-process." : "Creative iteration " + (variation + 1) + ": create a clearly different professional instrument concept. Choose a new source-role arrangement and a different transient/body relationship. Preserve the brief but do not reuse the previous architecture. Previous patch to avoid repeating: " + previous;
        const user = "Brief: " + prompt + "\nCategory: " + category + "\nDirection: " + direction + "\n\nComplete output structure and valid enum examples: " + JSON.stringify(base) + "\n\nAllowed actual Serum 2 factory wavetables: " + WAVETABLES.join(", ") + ". Allowed self-contained warp modes: " + WARP_MODES.join(", ") + ". Select source tables intentionally and use warp only when it contributes audible harmonic motion. Avoid FM-by-other-oscillator warp modes because their modulator dependency is not exposed in this UI.\n\nReturn a complete patch object. Give it a distinctive uppercase preset name, meaningful description and tags. Keep prompt equal to the brief.";
        let response: Response | undefined;
        let timedOut = false;
        // Gemini 3.8 Flash can be temporarily overloaded. Retry one time on
        // a timeout or 503, while keeping the total request inside the UI deadline.
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": key },
              signal: AbortSignal.timeout(18000),
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: "user", parts: [{ text: user }] }],
                generationConfig: { temperature: variation ? 0.95 : 0.75, maxOutputTokens: 3500, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "MEDIUM" } }
              })
            });
            if (response.status !== 503 || attempt === 1) break;
            await response.body?.cancel();
          } catch (error) {
            if (!(error instanceof Error) || (error.name !== "TimeoutError" && error.name !== "AbortError")) throw error;
            timedOut = true;
            if (attempt === 1) break;
          }
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
        if (!response || timedOut && response.status === 503) {
          return localFallback(prompt, category, variation);
        }
        if (!response.ok) {
          const detail = (await response.text()).slice(0, 500);
          const status = response.status === 429 ? 429 : response.status === 403 || response.status === 503 ? 503 : 502;
          const message = response.status === 429
            ? "Gemini's free usage limit has been reached for now. Please try again after the quota resets."
            : response.status === 503
              ? "Gemini is temporarily overloaded. Please try Generate again in a moment."
              : "Gemini API returned " + response.status + ": " + detail;
          if (response.status === 429 || response.status === 403 || response.status === 503) {
            return localFallback(prompt, category, variation);
          }
          return Response.json({ error: message }, { status });
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
        patch.oscC.level = clamp(patch.oscC.level, 0, 100, base.oscC.level);
        patch.oscA.unison = clamp(patch.oscA.unison, 1, 16, 1);
        patch.oscB.unison = clamp(patch.oscB.unison, 1, 16, 1);
        patch.filter.cutoff = clamp(patch.filter.cutoff, 20, 20000, base.filter.cutoff);
        patch.filter.resonance = clamp(patch.filter.resonance, 0, 100, base.filter.resonance);
        patch.ampEnv.attack = clamp(patch.ampEnv.attack, 0, 10000, 5);
        patch.ampEnv.decay = clamp(patch.ampEnv.decay, 0, 10000, 500);
        patch.ampEnv.sustain = clamp(patch.ampEnv.sustain, 0, 100, 50);
        patch.ampEnv.release = clamp(patch.ampEnv.release, 0, 15000, 300);
        const sanitizeOsc = (osc: Patch["oscA"], fallback: Patch["oscA"]) => {
          osc.wavetable = WAVETABLES.includes(osc.wavetable as typeof WAVETABLES[number]) ? osc.wavetable : fallback.wavetable;
          osc.wtPos = clamp(osc.wtPos, 0, 100, fallback.wtPos);
          osc.warpMode = WARP_MODES.includes(osc.warpMode as typeof WARP_MODES[number]) ? osc.warpMode : "None";
          osc.warpAmount = clamp(osc.warpAmount, 0, 100, 0);
          osc.octave = Math.round(clamp(osc.octave, -4, 4, fallback.octave));
          osc.semi = Math.round(clamp(osc.semi, -12, 12, fallback.semi));
          osc.fine = clamp(osc.fine, -100, 100, fallback.fine);
          osc.unison = Math.round(clamp(osc.unison, 1, 16, fallback.unison));
          osc.detune = clamp(osc.detune, 0, 100, fallback.detune);
          osc.blend = clamp(osc.blend, 0, 100, fallback.blend);
          osc.level = clamp(osc.level, 0, 100, fallback.level);
          osc.pan = clamp(osc.pan, -50, 50, fallback.pan);
        };
        sanitizeOsc(patch.oscA, base.oscA); sanitizeOsc(patch.oscB, base.oscB); sanitizeOsc(patch.oscC, base.oscC);
        patch.sub.octave = Math.round(clamp(patch.sub.octave, -4, 4, base.sub.octave));
        patch.sub.level = clamp(patch.sub.level, 0, 100, base.sub.level);
        patch.noise.level = clamp(patch.noise.level, 0, 100, base.noise.level);
        patch.filter.type = FILTER_TYPES.includes(patch.filter.type as typeof FILTER_TYPES[number]) ? patch.filter.type : base.filter.type;
        patch.filter.drive = clamp(patch.filter.drive, 0, 100, base.filter.drive);
        patch.filter.mix = clamp(patch.filter.mix, 0, 100, base.filter.mix);
        for (const env of [patch.ampEnv, patch.env2]) {
          env.attack = clamp(env.attack, 0, 15000, 5);
          env.hold = clamp(env.hold, 0, 10000, 0);
          env.decay = clamp(env.decay, 0, 15000, 500);
          env.sustain = clamp(env.sustain, 0, 100, 50);
          env.release = clamp(env.release, 0, 15000, 300);
        }
        patch.env2.amount = clamp(patch.env2.amount, 0, 100, base.env2.amount);
        patch.env2.target = MOD_TARGETS.includes(patch.env2.target as typeof MOD_TARGETS[number]) ? patch.env2.target : base.env2.target;
        for (const lfo of [patch.lfo1, patch.lfo2]) {
          lfo.shape = LFO_SHAPES.includes(lfo.shape as typeof LFO_SHAPES[number]) ? lfo.shape : "Sine";
          lfo.rate = clamp(lfo.rate, 0.01, 30, 0.25);
          lfo.amount = clamp(lfo.amount, 0, 100, 0);
          lfo.target = MOD_TARGETS.includes(lfo.target as typeof MOD_TARGETS[number]) ? lfo.target : "Filter Cutoff";
        }
        patch.fx.distortion.mode = DIST_MODES.includes(patch.fx.distortion.mode as typeof DIST_MODES[number]) ? patch.fx.distortion.mode : "Tube";
        patch.fx.distortion.drive = clamp(patch.fx.distortion.drive, 0, 100, 14);
        patch.fx.distortion.mix = clamp(patch.fx.distortion.mix, 0, 100, 30);
        patch.fx.chorus.rate = clamp(patch.fx.chorus.rate, 0.01, 20, 0.6);
        patch.fx.chorus.depth = clamp(patch.fx.chorus.depth, 0, 100, 32);
        patch.fx.chorus.mix = clamp(patch.fx.chorus.mix, 0, 100, 35);
        patch.fx.delay.time = clamp(patch.fx.delay.time, 1, 2000, 375);
        patch.fx.delay.feedback = clamp(patch.fx.delay.feedback, 0, 100, 32);
        patch.fx.delay.mix = clamp(patch.fx.delay.mix, 0, 100, 18);
        patch.fx.reverb.size = clamp(patch.fx.reverb.size, 0, 100, 78);
        patch.fx.reverb.decay = clamp(patch.fx.reverb.decay, 0.1, 20, 5.5);
        patch.fx.reverb.damping = clamp(patch.fx.reverb.damping, 0, 100, 55);
        patch.fx.reverb.mix = clamp(patch.fx.reverb.mix, 0, 100, 32);
        patch.fx.eq.lowGain = clamp(patch.fx.eq.lowGain, -12, 12, -2);
        patch.fx.eq.highGain = clamp(patch.fx.eq.highGain, -12, 12, -3);
        patch.fx.compressor.threshold = clamp(patch.fx.compressor.threshold, -60, 0, -18);
        patch.fx.compressor.ratio = clamp(patch.fx.compressor.ratio, 1, 20, 2.5);
        patch.fx.compressor.mix = clamp(patch.fx.compressor.mix, 0, 100, 70);
        patch.fx.dimension.size = clamp(patch.fx.dimension.size, 0, 100, 55);
        patch.fx.dimension.mix = clamp(patch.fx.dimension.mix, 0, 100, 40);
        patch.global.voices = Math.round(clamp(patch.global.voices, 1, 32, 8));
        patch.global.portamento = clamp(patch.global.portamento, 0, 2000, 0);
        patch.global.master = clamp(patch.global.master, 0, 100, 75);
        return Response.json({ patch, model: "gemini-3.8-flash (free tier)" });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Patch generation failed." }, { status: 500 });
      }
    }
  } }
});
