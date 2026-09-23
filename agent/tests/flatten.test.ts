import { describe, expect, it } from "vitest";
import { decodeMemo, encodeFlattenMemo } from "@specguard/core";
import { computeSellableLamports } from "../src/flatten/runFlatten.js";

describe("flatten", () => {
  it("computeSellableLamports respects fee reserve", () => {
    expect(computeSellableLamports(100_000_000n, 0.05)).toBe(50_000_000n);
    expect(computeSellableLamports(40_000_000n, 0.05)).toBe(0n);
  });

  it("flatten memo round-trips", () => {
    const text = encodeFlattenMemo({
      reason: "slice7_drill",
      sigs: ["abc", "def"],
    });
    const decoded = decodeMemo(text);
    expect(decoded?.kind).toBe("flatten");
    if (decoded?.kind === "flatten") {
      expect(decoded.reason).toBe("slice7_drill");
      expect(decoded.sigs).toEqual(["abc", "def"]);
    }
  });
});
