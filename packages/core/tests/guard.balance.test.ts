import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUARD_MIN_BALANCE_RAW,
  formatTokenWhole,
  meetsGuardMinimum,
  parseGuardMinBalanceRaw,
} from "../src/guard/balance.js";

describe("guard balance helpers", () => {
  it("parses min raw from env", () => {
    expect(parseGuardMinBalanceRaw(undefined)).toBe(
      DEFAULT_GUARD_MIN_BALANCE_RAW,
    );
    expect(parseGuardMinBalanceRaw("5000")).toBe(5000n);
  });

  it("evaluates meetsMinimum with bigint", () => {
    const min = DEFAULT_GUARD_MIN_BALANCE_RAW;
    expect(meetsGuardMinimum(min - 1n, min)).toBe(false);
    expect(meetsGuardMinimum(min, min)).toBe(true);
    expect(meetsGuardMinimum(min + 1n, min)).toBe(true);
  });

  it("formats whole tokens with decimals", () => {
    expect(formatTokenWhole(2_000_000_000_000n, 6)).toBe("2,000,000");
    expect(formatTokenWhole(0n, 6)).toBe("0");
  });
});
