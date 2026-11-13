import { describe, expect, it } from "vitest";
import { CELESTIAL_KEYS } from "./presets";
import { applyVariation } from "./variations";
import { generatePatch } from "./generator";
import { EXPORTERS, buildSpec } from "./export";
import { upgradePatch } from "./storage";
import { SERUM_FACTORY_WAVETABLES, WAVETABLES, WARP_MODES } from "./types";

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
  it("native export is available as beta and JSON is labeled non-native", () => {
    expect(EXPORTERS.find((e) => e.id === "serum2-native")?.available).toBe(true);
    expect(EXPORTERS.find((e) => e.id === "serum2-native")?.verified).toBe(false);
    expect(buildSpec(CELESTIAL_KEYS).nativePresetFormat).toBe(false);
  });
});