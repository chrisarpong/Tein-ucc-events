/**
 * Normalizes a Ghana phone number into strict E.164 format (+233XXXXXXXXX).
 * Accepts:
 *   - "0241234567"  (local 10-digit with leading 0)
 *   - "+233241234567" (E.164)
 *   - "233241234567"  (without plus)
 *   - "241234567"     (9-digit without country code or leading 0)
 *
 * Strips whitespace, hyphens, parentheses.
 * Rejects invalid lengths or non-numeric input.
 */

export type NormalizePhoneResult =
  | { ok: true; e164: string; national: string }
  | { ok: false; error: string };

export function normalizePhone(raw: string): NormalizePhoneResult {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "Phone number is required" };
  }

  // Remove whitespace, dashes, dots, brackets
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, "");

  // Remove leading '+' if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Reject if any non-digits remain
  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, error: "Phone number must contain digits only" };
  }

  // Case 1: starts with 233
  if (cleaned.startsWith("233")) {
    cleaned = cleaned.slice(3);
  }
  // Case 2: starts with 0
  else if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  // At this point, valid Ghana mobile numbers must be exactly 9 digits
  if (cleaned.length !== 9) {
    return {
      ok: false,
      error: `Invalid Ghana phone number: expected 9 digits (got ${cleaned.length})`,
    };
  }

  // Valid prefixes in Ghana mobile: 2x, 5x (e.g. 24, 20, 27, 26, 28, 54, 55, 59, 50, 57, etc.)
  // and landlines: 3x (e.g. 30, 31, 32, 33...)
  const validStart = ["2", "3", "5"];
  if (!validStart.includes(cleaned[0])) {
    return {
      ok: false,
      error: "Phone number must start with a valid Ghana network prefix",
    };
  }

  const e164 = `+233${cleaned}`;
  const national = `0${cleaned}`;

  return { ok: true, e164, national };
}
