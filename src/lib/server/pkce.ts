import { createHash, randomBytes } from "node:crypto";

/** RFC 7636 S256: the backend checks base64url(sha256(verifier)). */
export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}
