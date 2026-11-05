const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRawCode(length: number = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    result += ALPHABET[randomIndex];
  }
  return result;
}

export function generateTicketCode(): string {
  return `WES-${generateRawCode(6)}`;
}

export function generateInviteCode(): string {
  return generateRawCode(8);
}
