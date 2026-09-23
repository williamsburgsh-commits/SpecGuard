import { describe, expect, it } from "vitest";
import { isHeartbeatStale } from "../lib/cron/heartbeatSweep";

describe("isHeartbeatStale", () => {
  const now = new Date("2026-09-21T12:00:00Z");
  const interval = 300;

  it("fresh heartbeat within 2x interval is not stale", () => {
    const last = new Date("2026-09-21T11:55:00Z");
    expect(isHeartbeatStale(last, interval, now)).toBe(false);
  });

  it("missing heartbeat is stale", () => {
    expect(isHeartbeatStale(null, interval, now)).toBe(true);
  });

  it("older than 2x interval is stale", () => {
    const last = new Date("2026-09-21T11:50:00Z");
    expect(isHeartbeatStale(last, interval, now)).toBe(false);
    const stale = new Date("2026-09-21T11:49:59Z");
    expect(isHeartbeatStale(stale, interval, now)).toBe(true);
  });
});
