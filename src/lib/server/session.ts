import { randomBytes } from "node:crypto";

import type { SessionCredentials } from "@ayenisholah/perpeto-api-client";

import { seal, unseal } from "./seal";

/**
 * The browser session (DEC-0021). The browser holds only this sealed,
 * httpOnly cookie; the access token, refresh token and CSRF secret never reach
 * page JavaScript.
 */
export type WebSession =
  | {
      readonly kind: "user";
      readonly accessToken: string;
      /** Epoch milliseconds. */
      readonly accessExpiresAt: number;
      readonly refreshToken: string;
      readonly deviceId: string;
      readonly csrf: string;
    }
  | {
      /** The read-only demo (DEC-0017): access-only, renewed by asking again. */
      readonly kind: "demo";
      readonly accessToken: string;
      readonly accessExpiresAt: number;
      readonly csrf: string;
    };

/** A sign-in in progress: the PKCE verifier and challenge, or the MFA step. */
export type PendingSignIn =
  | {
      readonly step: "provider";
      readonly challengeId: string;
      readonly verifier: string;
      readonly nonce: string;
      readonly expiresAt: number;
    }
  | { readonly step: "mfa"; readonly challengeToken: string; readonly expiresAt: number };

export const SESSION_PURPOSE = "perpeto-session";
export const PENDING_PURPOSE = "perpeto-pending";

/** Renew this long before the access token lapses. */
export const RENEW_LEAD_MS = 60_000;
/** The session cookie outlives the refresh token's 30-day window by nothing. */
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;
export const PENDING_MAX_AGE_S = 10 * 60;

export function cookieName(base: "session" | "pending" | "device", secure: boolean): string {
  return secure ? `__Host-perpeto-${base}` : `perpeto-${base}`;
}

export function cookieOptions(secure: boolean, maxAge: number) {
  return { httpOnly: true, secure, sameSite: "strict" as const, path: "/", maxAge };
}

export function newCsrfSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function userSession(credentials: SessionCredentials, csrf = newCsrfSecret()): WebSession {
  return {
    kind: "user",
    accessToken: credentials.access_token,
    accessExpiresAt: Date.parse(credentials.access_token_expires_at),
    refreshToken: credentials.refresh_token,
    deviceId: credentials.device_id,
    csrf,
  };
}

export function needsRenewal(session: WebSession, now: number): boolean {
  return !Number.isFinite(session.accessExpiresAt) || session.accessExpiresAt - now < RENEW_LEAD_MS;
}

export function sealSession(key: Buffer, session: WebSession): string {
  return seal(key, SESSION_PURPOSE, session);
}

export function unsealSession(key: Buffer, value: string | undefined): WebSession | undefined {
  const session = unseal<WebSession>(key, SESSION_PURPOSE, value);
  if (session === undefined || (session.kind !== "user" && session.kind !== "demo")) return undefined;
  return session;
}

export function sealPending(key: Buffer, pending: PendingSignIn): string {
  return seal(key, PENDING_PURPOSE, pending);
}

export function unsealPending(
  key: Buffer,
  value: string | undefined,
  now: number,
): PendingSignIn | undefined {
  const pending = unseal<PendingSignIn>(key, PENDING_PURPOSE, value);
  if (pending === undefined || pending.expiresAt <= now) return undefined;
  return pending;
}
