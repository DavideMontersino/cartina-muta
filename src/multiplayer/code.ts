/**
 * Room-code generation. Short and unambiguous — no 0/O, 1/I/L — so a code is
 * easy to read aloud and type. 4 chars over a 31-symbol alphabet ≈ 920k codes,
 * plenty for concurrent party rooms; the Worker still re-rolls on the rare
 * collision (see POST /rooms).
 */

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;

/** `rng` is injectable so tests are deterministic. */
export function generateCode(rng: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Normalise typed input to a canonical code: uppercase, drop anything not in
 *  the alphabet (spaces, dashes, and the excluded confusables like O/0/I/1). */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join("");
}

export function isValidCode(code: string): boolean {
  return (
    code.length === CODE_LENGTH &&
    code.split("").every((ch) => CODE_ALPHABET.includes(ch))
  );
}
