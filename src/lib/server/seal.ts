import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Authenticated encryption for cookie values (AES-256-GCM). The cookie name is
 * bound as associated data, so a value sealed for one cookie cannot be replayed
 * as another. Format: `v1.<base64url(iv | tag | ciphertext)>`.
 */
const VERSION = "v1.";

export function seal(key: Buffer, purpose: string, value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return VERSION + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

/** Returns `undefined` for anything not sealed by `seal` with this key and purpose. */
export function unseal<T>(key: Buffer, purpose: string, sealed: string | undefined): T | undefined {
  if (sealed === undefined || !sealed.startsWith(VERSION)) return undefined;
  const raw = Buffer.from(sealed.slice(VERSION.length), "base64url");
  if (raw.length < 12 + 16 + 1) return undefined;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(purpose, "utf8"));
    decipher.setAuthTag(raw.subarray(12, 28));
    const plaintext = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return undefined;
  }
}
