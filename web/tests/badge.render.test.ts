import { describe, expect, it } from "vitest";
import { renderBadgeSvg } from "../lib/badge/render";

describe("renderBadgeSvg", () => {
  it("renders GREEN verified badge", () => {
    const svg = renderBadgeSvg({ state: "green" });
    expect(svg).toContain("Verified");
    expect(svg).toContain("SpecGuard");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("renders RED with breach date", () => {
    const svg = renderBadgeSvg({
      state: "red",
      breachDate: "2026-09-21",
    });
    expect(svg).toContain("BREACHED");
    expect(svg).toContain("2026-09-21");
  });

  it("renders unknown wallet state", () => {
    const svg = renderBadgeSvg({ state: "unknown" });
    expect(svg).toContain("Not registered");
  });

  it("escapes custom label", () => {
    const svg = renderBadgeSvg({
      state: "green",
      label: 'test"<script>',
    });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&quot;");
  });
});
