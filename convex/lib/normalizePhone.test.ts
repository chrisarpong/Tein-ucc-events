import { describe, it, expect } from "vitest";
import { normalizePhone } from "./normalizePhone";

describe("normalizePhone", () => {
  const expectedE164 = "+233248831639";
  const expectedNational = "0248831639";

  it("normalizes local 10-digit format (024...)", () => {
    const res = normalizePhone("0248831639");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.e164).toBe(expectedE164);
      expect(res.national).toBe(expectedNational);
    }
  });

  it("normalizes E.164 format (+23324...)", () => {
    const res = normalizePhone("+233248831639");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.e164).toBe(expectedE164);
      expect(res.national).toBe(expectedNational);
    }
  });

  it("normalizes international without plus (23324...)", () => {
    const res = normalizePhone("233248831639");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.e164).toBe(expectedE164);
      expect(res.national).toBe(expectedNational);
    }
  });

  it("normalizes 9-digit format without leading 0 (24...)", () => {
    const res = normalizePhone("248831639");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.e164).toBe(expectedE164);
      expect(res.national).toBe(expectedNational);
    }
  });

  it("handles whitespace, dashes, and parentheses", () => {
    const res = normalizePhone(" +233 (24) 883-1639 ");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.e164).toBe(expectedE164);
    }
  });

  it("handles Telecel/Vodafone 020 and 050", () => {
    const res = normalizePhone("0201234567");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.e164).toBe("+233201234567");
    }
  });

  it("handles AT/AirtelTigo 027 and 057", () => {
    const res = normalizePhone("0571234567");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.e164).toBe("+233571234567");
    }
  });

  it("rejects invalid input", () => {
    expect(normalizePhone("").ok).toBe(false);
    expect(normalizePhone("12345").ok).toBe(false);
    expect(normalizePhone("0248831639999").ok).toBe(false);
    expect(normalizePhone("024883163a").ok).toBe(false);
    expect(normalizePhone("0148831639").ok).toBe(false); // 1 is not valid prefix in Ghana
  });
});

