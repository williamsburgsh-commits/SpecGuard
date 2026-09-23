import { describe, expect, it } from "vitest";
import {
  getSiteNavLinks,
  resolvePhoenixPublicUrl,
} from "../lib/siteLinks";

describe("siteLinks", () => {
  it("defaults phoenix to specguard.xyz", () => {
    const prev = process.env.NEXT_PUBLIC_PHOENIX_URL;
    delete process.env.NEXT_PUBLIC_PHOENIX_URL;
    expect(resolvePhoenixPublicUrl()).toBe("https://specguard.xyz");
    if (prev) process.env.NEXT_PUBLIC_PHOENIX_URL = prev;
  });

  it("builds nav paths from registry base", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://registry.example.com";
    const links = getSiteNavLinks();
    expect(links.registry).toBe("https://registry.example.com/registry");
    expect(links.register).toBe("https://registry.example.com/register");
    expect(links.phoenixStatusJson).toContain("status.json");
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
});
