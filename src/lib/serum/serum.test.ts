import { describe, expect, it } from "vitest";
import { CELESTIAL_KEYS } from "./presets";
import { applyVariation } from "./variations";
import { generatePatch } from "./generator";
import { EXPORTERS, buildSpec } from "./export";
import { upgradePatch } from "./storage";
import { SERUM_FACTORY_WAVETABLES, WAVETABLES, WARP_MODES } from "./types";
import { applySoundArchitecture, evaluateAndRepairPatch, planSoundArchitecture } from "./intelligence";

describe("Serum Lab engine", () => {
  it("starter preset is CELESTIAL KEYS in Keys", () => {
    expect(CELESTIAL_KEYS.name).toBe("CELESTIAL KEYS");
    expect(CELESTIAL_KEYS.category).toBe("Keys");
    expect(CELESTIAL_KEYS.oscC.enabled).toBe(false);
    expect(CELESTIAL_KEYS.oscC.level).toBeGreaterThan(0);
  });
  it("Darker lowers cutoff, Brighter raises it", () => {
    expect(applyVariation(CELESTIAL_KEYS, "darker").filter.cutoff).toBeLessThan(2400);
    expect(applyVariation(CELESTIAL_KEYS, "brighter").filter.cutoff).toBeGreaterThan(2400);
  });
  it("Wider adds unison voices", () => {
    expect(applyVariation(CELESTIAL_KEYS, "wider").oscA.unison).toBe(5);
  });
  it("prompt mentioning bass switches category, and is deterministic", () => {
    const a = generatePatch({ prompt: "dark gritty bass", category: "Keys" }, "t", "x");
    const b = generatePatch({ prompt: "dark gritty bass", category: "Keys" }, "t", "x");
    expect(a.category).toBe("Bass");
    expect(a).toEqual(b);
  });
  it("legacy saved patches gain oscillator C without losing their settings", () => {
    const legacy = { ...CELESTIAL_KEYS } as Partial<typeof CELESTIAL_KEYS>;
    delete legacy.oscC;
    delete legacy.macros;
    const upgraded = upgradePatch(legacy as typeof CELESTIAL_KEYS);
    expect(upgraded.macros).toHaveLength(4);
    expect(upgraded.oscC.enabled).toBe(false);
    expect(upgraded.oscA.wavetable).toBe(CELESTIAL_KEYS.oscA.wavetable);
  });
  it("legacy descriptive wavetable labels migrate to real Serum factory tables", () => {
    const legacy = { ...CELESTIAL_KEYS, oscA: { ...CELESTIAL_KEYS.oscA, wavetable: "Warm FM" } };
    expect(upgradePatch(legacy).oscA.wavetable).toBe("Warm Analog / DM-OSCAR");
  });
  it("every selectable wavetable has an exact Serum factory file reference", () => {
    expect(Object.keys(SERUM_FACTORY_WAVETABLES).sort()).toEqual([...WAVETABLES].sort());
    expect(SERUM_FACTORY_WAVETABLES["FM Piano"].path).toBe("S2 Tables/Digital/FM Piano.wav");
    expect(SERUM_FACTORY_WAVETABLES["JF Flute"].frames).toBe(524288);
  });
  it("starter oscillators initialize both warp lanes to neutral", () => {
    for (const osc of [CELESTIAL_KEYS.oscA, CELESTIAL_KEYS.oscB, CELESTIAL_KEYS.oscC]) {
      expect(osc.warpMode).toBe("None");
      expect(osc.warpAmount).toBe(0);
      expect(osc.warpMode2).toBe("None");
      expect(osc.warpAmount2).toBe(0);
    }
  });
  it("warp options are restricted to the empirically supported Serum 2 subset", () => {
    expect(WARP_MODES).toEqual(["None", "Sync", "PWM", "Bend +", "Wavefold", "Soft Clip", "Hard Clip", "Quantize", "Filter LPF", "Filter HPF"]);
  });
  it("starter patch exposes four performance macros with real destinations", () => {
    expect(CELESTIAL_KEYS.macros).toHaveLength(4);
    expect(CELESTIAL_KEYS.macros.map((m) => m.name)).toEqual(["TONE", "MOTION", "SPACE", "EDGE"]);
    expect(CELESTIAL_KEYS.macros.every((m) => m.value >= 0 && m.value <= 100)).toBe(true);
  });
  it("plans distinct sound architectures for emotional piano and Rhodes briefs", () => {
    expect(planSoundArchitecture("Fred again inspired emotional piano keys", "Keys", 0).id).toBe("emotive-keys");
    expect(planSoundArchitecture("warm Rhodes electric piano", "Keys", 0).id).toBe("rhodes-keys");
    expect(planSoundArchitecture("warm Rhodes electric piano", "Keys", 1).id).not.toBe("rhodes-keys");
  });
  it("offline keys generation assigns separate body and tine layers", () => {
    const patch = generatePatch({ prompt: "Fred again inspired emotional piano keys", category: "Keys" }, "t", "architecture-test");
    expect(patch.oscA.wavetable).toBe("Warm Analog / DM-OSCAR");
    expect(patch.oscB.wavetable).toBe("FM Piano");
    expect(patch.oscB.octave).toBe(1);
    expect(patch.ampEnv.attack).toBeLessThanOrEqual(3);
  });
  it("quality control repairs bass width, sub and wet-effect conflicts", () => {
    const patch = structuredClone(CELESTIAL_KEYS);
    patch.category = "Bass"; patch.oscA.unison = 8; patch.oscB.pan = 30;
    patch.fx.reverb.enabled = true; patch.fx.chorus.enabled = true; patch.sub.enabled = false;
    const report = evaluateAndRepairPatch(patch, "deep mono bass");
    expect(patch.global.voices).toBe(1);
    expect(patch.sub.enabled).toBe(true);
    expect(patch.oscA.unison).toBe(1);
    expect(patch.oscB.pan).toBe(0);
    expect(patch.fx.reverb.enabled).toBe(false);
    expect(patch.fx.chorus.enabled).toBe(false);
    expect(report.score).toBe(100);
  });
  it("offline architecture uses only selectable Serum factory wavetables", () => {
    const patch = structuredClone(CELESTIAL_KEYS);
    const plan = applySoundArchitecture(patch, "glass bell pluck", "Pluck", 0);
    expect(plan.id).toBe("fm-bell");
    for (const key of ["oscA", "oscB", "oscC"] as const) expect(WAVETABLES).toContain(patch[key].wavetable);
  });
  it("native export is available as beta and JSON is labeled non-native", () => {
    expect(EXPORTERS.find((e) => e.id === "serum2-native")?.available).toBe(true);
    expect(EXPORTERS.find((e) => e.id === "serum2-native")?.verified).toBe(false);
    expect(buildSpec(CELESTIAL_KEYS).nativePresetFormat).toBe(false);
  });
});