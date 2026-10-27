/**
 * Returns a deterministic, non-cryptographic fingerprint for change detection.
 * Do not use this value for authentication, signatures, or security decisions.
 */
export function fingerprintText(text: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, "0");
}
