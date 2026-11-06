const encoder = new TextEncoder();

export async function keyedHash(value: string) {
  const pepper = process.env.AUTH_RECOVERY_PEPPER?.trim();
  if (!pepper || pepper.length < 32) throw new Error("Authentication recovery is not configured.");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomDigits(length: number) {
  const ceiling = 10 ** length;
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / ceiling) * ceiling;
  let value: number;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= limit);
  return String(value % ceiling).padStart(length, "0");
}

export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
