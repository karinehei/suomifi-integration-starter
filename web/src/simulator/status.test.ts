import { describe, expect, it } from "vitest";
import { getStatusReport } from "./status";

const ALLOWED = new Set(["Implemented", "Stubbed", "Planned", "Not implemented", "Not verified"]);

describe("implementation status evidence", () => {
  it("uses only supported statuses and cites repository files", () => {
    const report = getStatusReport();
    expect(report.rows.length).toBeGreaterThan(8);
    for (const row of report.rows) {
      expect(ALLOWED.has(row.status)).toBe(true);
      expect(row.evidence.length).toBeGreaterThan(20);
      expect(row.paths.length).toBeGreaterThan(0);
      expect(row.evidence).not.toMatch(/\d+\s*%/);
    }
    expect(report.providerNote).toContain("3 December 2026");
    expect(report.providerNote).toContain("not been validated");
  });
});
