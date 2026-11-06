const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRawCode(length: number = 6): string {
  let result = "";
  const unbiasedLimit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(Math.max(length, 8)));
    for (const byte of bytes) {
      if (byte >= unbiasedLimit) continue;
      result += ALPHABET[byte % ALPHABET.length];
      if (result.length === length) break;
    }
  }
  return result;
}

export function generateTicketCode(): string {
  return `WES-${generateRawCode(6)}`;
}

export function generateInviteCode(): string {
  return generateRawCode(8);
}

