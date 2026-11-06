import { describe, expect, it } from "vitest";
import { csvCell } from "./csv";

describe("csvCell", () => {
  it("quotes values and doubles embedded quote characters", () => {
    expect(csvCell('A "quoted" name')).toBe('"A ""quoted"" name"');
  });

  it("neutralizes spreadsheet formula prefixes", () => {
    for (const value of ["=1+1", "+cmd", "-1+2", "@SUM(A1:A2)", "  =1+1"]) {
      expect(csvCell(value).startsWith("\"'")).toBe(true);
    }
  });

  it("handles empty values and line breaks", () => {
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell("line 1\nline 2")).toBe('"line 1\nline 2"');
  });
});
