import { describe, expect, it } from "vitest";
import { generateRawCode, generateTicketCode } from "./ticketCode";

describe("ticketCode", () => {
  it("creates a ticket code in the displayed format", () => {
    expect(generateTicketCode()).toMatch(/^WES-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  });

  it("uses only the unambiguous code alphabet at the requested length", () => {
    const code = generateRawCode(32);
    expect(code).toHaveLength(32);
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]+$/);
  });
});
