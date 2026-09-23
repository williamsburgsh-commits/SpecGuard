import { describe, expect, it } from "vitest";
import type { AgentListRow } from "../lib/agents/listAgents";

function sortByDays(rows: AgentListRow[], order: "asc" | "desc") {
  const copy = [...rows];
  copy.sort((a, b) => {
    const da = a.daysActive ?? -1;
    const db = b.daysActive ?? -1;
    return order === "asc" ? da - db : db - da;
  });
  return copy;
}

describe("registry list ordering", () => {
  it("sorts by days active descending", () => {
    const rows: AgentListRow[] = [
      {
        wallet: "a",
        name: "A",
        status: "GREEN",
        statusSince: "",
        registeredAt: "2026-09-01T00:00:00Z",
        daysActive: 5,
        isSpecguard: false,
        lastTxAt: null,
        lastVerifiedAt: null,
        realizedUsdc: null,
        policySummary: null,
      },
      {
        wallet: "b",
        name: "B",
        status: "RED",
        statusSince: "",
        registeredAt: "2026-09-10T00:00:00Z",
        daysActive: 20,
        isSpecguard: false,
        lastTxAt: null,
        lastVerifiedAt: null,
        realizedUsdc: null,
        policySummary: null,
      },
    ];
    const sorted = sortByDays(rows, "desc");
    expect(sorted[0]?.wallet).toBe("b");
  });
});
