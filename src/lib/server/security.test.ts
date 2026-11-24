import { createHash, randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { parseWebConfig } from "./config";
import { csrfTokenMatches, isSameOriginRequest } from "./csrf";
import { createPkce } from "./pkce";
import { seal, unseal } from "./seal";
import {
  cookieName,
  cookieOptions,
  needsRenewal,
  sealPending,
  sealSession,
  unsealPending,
  unsealSession,
  userSession,
  type WebSession,
} from "./session";

const key = randomBytes(32);
const otherKey = randomBytes(32);

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("seal", () => {
  it("round-trips a value under the same key and purpose", () => {
    const sealed = seal(key, "purpose", { a: 1 });
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(unseal(key, "purpose", sealed)).toEqual({ a: 1 });
  });

  it("refuses another key, another purpose, tampering and garbage", () => {
    const sealed = seal(key, "purpose", { a: 1 });
    expect(unseal(otherKey, "purpose", sealed)).toBeUndefined();
    expect(unseal(key, "other-purpose", sealed)).toBeUndefined();
    const last = sealed.at(-1) === "A" ? "B" : "A";
    expect(unseal(key, "purpose", sealed.slice(0, -1) + last)).toBeUndefined();
    expect(unseal(key, "purpose", "v1.short")).toBeUndefined();
    expect(unseal(key, "purpose", "plain")).toBeUndefined();
    expect(unseal(key, "purpose", undefined)).toBeUndefined();
  });

  it("does not reveal the plaintext", () => {
    const sealed = seal(key, "purpose", { refreshToken: "very-secret-refresh" });
    expect(Buffer.from(sealed.slice(3), "base64url").toString("utf8")).not.toContain("very-secret-refresh");
  });
});

describe("session", () => {
  const credentials = {
    access_token: "access",
    access_token_expires_at: "2026-11-24T10:15:00Z",
    refresh_token: "refresh",
    session_id: "session",
    device_id: "device",
  };

  it("builds a user session with a fresh CSRF secret and round-trips it", () => {
    const session = userSession(credentials);
    expect(session).toMatchObject({ kind: "user", accessToken: "access", refreshToken: "refresh", deviceId: "device" });
    expect(session.csrf.length).toBeGreaterThanOrEqual(43);
    expect(unsealSession(key, sealSession(key, session))).toEqual(session);
  });

  it("keeps the CSRF secret across a refresh", () => {
    expect(userSession(credentials, "kept").csrf).toBe("kept");
  });

  it("rejects a pending sign-in sealed as a session, and an unknown kind", () => {
    const pending = sealPending(key, { step: "mfa", challengeToken: "t", expiresAt: Date.now() + 1000 });
    expect(unsealSession(key, pending)).toBeUndefined();
    expect(unsealSession(key, seal(key, "perpeto-session", { kind: "admin" }))).toBeUndefined();
  });

  it("renews a minute before expiry, and when the expiry is unreadable", () => {
    const now = Date.parse("2026-11-24T10:00:00Z");
    const session: WebSession = { kind: "demo", accessToken: "a", accessExpiresAt: now + 61_000, csrf: "c" };
    expect(needsRenewal(session, now)).toBe(false);
    expect(needsRenewal({ ...session, accessExpiresAt: now + 59_000 }, now)).toBe(true);
    expect(needsRenewal({ ...session, accessExpiresAt: Number.NaN }, now)).toBe(true);
  });

  it("expires a pending sign-in", () => {
    const now = Date.now();
    const sealed = sealPending(key, { step: "mfa", challengeToken: "t", expiresAt: now + 1000 });
    expect(unsealPending(key, sealed, now)).toMatchObject({ step: "mfa" });
    expect(unsealPending(key, sealed, now + 1000)).toBeUndefined();
  });

  it("uses __Host- cookies that are httpOnly and SameSite=Strict", () => {
    expect(cookieName("session", true)).toBe("__Host-perpeto-session");
    expect(cookieName("session", false)).toBe("perpeto-session");
    expect(cookieOptions(true, 60)).toEqual({ httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 });
  });
});

describe("csrf", () => {
  const origin = "https://app.perpeto.xyz";

  it("accepts only the exact origin, and same-origin fetch metadata", () => {
    expect(isSameOriginRequest(headers({ origin, "sec-fetch-site": "same-origin" }), origin)).toBe(true);
    expect(isSameOriginRequest(headers({ origin }), origin)).toBe(true);
    expect(isSameOriginRequest(headers({ origin, "sec-fetch-site": "same-site" }), origin)).toBe(false);
    expect(isSameOriginRequest(headers({ origin: "https://evil.example" }), origin)).toBe(false);
    expect(isSameOriginRequest(headers({ origin: "https://app.perpeto.xyz.evil.example" }), origin)).toBe(false);
    expect(isSameOriginRequest(headers({}), origin)).toBe(false);
  });

  it("compares the synchronizer token exactly", () => {
    expect(csrfTokenMatches("token", "token")).toBe(true);
    expect(csrfTokenMatches("token", "tokem")).toBe(false);
    expect(csrfTokenMatches("token", "token2")).toBe(false);
    expect(csrfTokenMatches("token", "")).toBe(false);
    expect(csrfTokenMatches("token", null)).toBe(false);
  });
});

describe("pkce", () => {
  it("derives the S256 challenge the backend verifies", () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });
});

describe("config", () => {
  const base = {
    PERPETO_API_URL: "http://api:8080/",
    PERPETO_WEB_ORIGIN: "https://app.perpeto.xyz/",
    PERPETO_WEB_SESSION_KEY: randomBytes(32).toString("base64"),
  };

  it("normalizes URLs and derives secure cookies from the origin", () => {
    const config = parseWebConfig(base);
    expect(config.apiUrl).toBe("http://api:8080");
    expect(config.origin).toBe("https://app.perpeto.xyz");
    expect(config.secureCookies).toBe(true);
    expect(config.devSignIn).toBe(false);
  });

  it("requires every value and a 32-byte key", () => {
    expect(() => parseWebConfig({ ...base, PERPETO_API_URL: undefined })).toThrow("PERPETO_API_URL");
    expect(() => parseWebConfig({ ...base, PERPETO_WEB_SESSION_KEY: "c2hvcnQ=" })).toThrow("32 bytes");
  });

  it("allows development sign-in only on a plain-HTTP origin", () => {
    expect(() => parseWebConfig({ ...base, PERPETO_WEB_DEV_SIGN_IN: "true" })).toThrow("local development");
    const local = parseWebConfig({ ...base, PERPETO_WEB_ORIGIN: "http://127.0.0.1:3000", PERPETO_WEB_DEV_SIGN_IN: "true" });
    expect(local.devSignIn).toBe(true);
    expect(local.secureCookies).toBe(false);
  });
});
