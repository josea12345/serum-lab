import { describe, expect, it } from "vitest";
import { CELESTIAL_KEYS } from "./presets";
import { applyVariation } from "./variations";
import { generatePatch } from "./generator";
import { EXPORTERS, buildSpec } from "./export";

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
  it("native export is available as beta and JSON is labeled non-native", () => {
    expect(EXPORTERS.find((e) => e.id === "serum2-native")?.available).toBe(true);
    expect(EXPORTERS.find((e) => e.id === "serum2-native")?.verified).toBe(false);
    expect(buildSpec(CELESTIAL_KEYS).nativePresetFormat).toBe(false);
  });
});