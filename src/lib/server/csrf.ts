import { timingSafeEqual } from "node:crypto";

/**
 * Cross-site request checks for every state-changing request (DEC-0021,
 * PRODUCT_SPEC: a cookie-based web console must add origin and CSRF
 * protection). Server Actions already compare Origin with Host; these checks
 * add an exact match against the configured public origin, the browser's
 * Fetch Metadata, and a per-session synchronizer token.
 */
export function isSameOriginRequest(
  headers: { get(name: string): string | null },
  expectedOrigin: string,
): boolean {
  const origin = headers.get("origin");
  if (origin === null || origin !== expectedOrigin) return false;
  const site = headers.get("sec-fetch-site");
  // Browsers that send Fetch Metadata must say same-origin; older ones that
  // omit it are still bound by the exact Origin match above.
  return site === null || site === "same-origin";
}

export function csrfTokenMatches(expected: string, supplied: FormDataEntryValue | null): boolean {
  if (typeof supplied !== "string" || supplied.length === 0) return false;
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(supplied, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
