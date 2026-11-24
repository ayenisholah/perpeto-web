"use server";

import { randomBytes } from "node:crypto";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { PerpetoApiError, type AuthTransition, type SocialProvider } from "@ayenisholah/perpeto-api-client";

import { apiClient, currentSession } from "@/lib/server/api";
import { webConfig } from "@/lib/server/config";
import { assertFormRequest, assertSameOrigin } from "@/lib/server/guard";
import { createPkce } from "@/lib/server/pkce";
import {
  cookieName,
  cookieOptions,
  newCsrfSecret,
  PENDING_MAX_AGE_S,
  sealPending,
  sealSession,
  SESSION_MAX_AGE_S,
  unsealPending,
  userSession,
  type WebSession,
} from "@/lib/server/session";

/** What the sign-in page does next after a provider returns. */
export type SignInResult = { readonly next: string } | { readonly error: string };

const DEVICE_MAX_AGE_S = 400 * 24 * 60 * 60;

/**
 * Starts a sign-in: a server-side PKCE pair and a backend challenge. The
 * verifier stays in a sealed cookie; the browser only learns the nonce, which
 * the provider must echo inside its ID token.
 */
export async function beginSignIn(provider: SocialProvider): Promise<{ nonce: string }> {
  await assertSameOrigin();
  const config = webConfig();
  const pkce = createPkce();
  const challenge = await apiClient().createSocialChallenge(provider, config.origin, pkce.challenge);
  const store = await cookies();
  store.set(
    cookieName("pending", config.secureCookies),
    sealPending(config.sessionKey, {
      step: "provider",
      challengeId: challenge.id,
      verifier: pkce.verifier,
      nonce: challenge.nonce,
      expiresAt: Date.now() + PENDING_MAX_AGE_S * 1000,
    }),
    cookieOptions(config.secureCookies, PENDING_MAX_AGE_S),
  );
  return { nonce: challenge.nonce };
}

/** Finishes a provider sign-in with the ID token the provider returned. */
export async function completeSignIn(
  provider: SocialProvider,
  identityToken: string,
  displayName?: string,
): Promise<SignInResult> {
  await assertSameOrigin();
  const config = webConfig();
  const store = await cookies();
  const pending = unsealPending(
    config.sessionKey,
    store.get(cookieName("pending", config.secureCookies))?.value,
    Date.now(),
  );
  if (pending?.step !== "provider") return { error: "The sign-in expired. Try again." };

  let transition: AuthTransition;
  try {
    transition = await apiClient().exchangeSocialAuthorization({
      challenge_id: pending.challengeId,
      authorization_code: "web",
      identity_token: identityToken,
      code_verifier: pending.verifier,
      apple_profile: provider === "APPLE" && displayName ? { display_name: displayName } : undefined,
      device: {
        installation_id: await installationId(),
        platform: "WEB",
        app_version: "web",
        display_name: browserName((await headers()).get("user-agent")),
      },
    });
  } catch (error) {
    return { error: describe(error) };
  }
  return await settle(transition);
}

/** Development sign-in: a synthetic token a PAPER backend with dev auth accepts. */
export async function devSignIn(): Promise<SignInResult> {
  if (!webConfig().devSignIn) return { error: "Development sign-in is off." };
  const { nonce } = await beginSignIn("GOOGLE");
  return await completeSignIn("GOOGLE", `perpeto-dev:web-owner:owner@perpeto.invalid:${nonce}`);
}

/** Opens the read-only public demo (DEC-0017). */
export async function startDemo(): Promise<void> {
  await assertSameOrigin();
  const demo = await apiClient().createDemoSession();
  await writeSession({
    kind: "demo",
    accessToken: demo.access_token,
    accessExpiresAt: Date.parse(demo.access_token_expires_at),
    csrf: newCsrfSecret(),
  });
  redirect("/");
}

export async function verifyMfa(_state: SignInResult | null, form: FormData): Promise<SignInResult> {
  await assertSameOrigin();
  const config = webConfig();
  const store = await cookies();
  const pending = unsealPending(
    config.sessionKey,
    store.get(cookieName("pending", config.secureCookies))?.value,
    Date.now(),
  );
  if (pending?.step !== "mfa") return { error: "The sign-in expired. Start again." };
  const code = String(form.get("code") ?? "").trim();
  const recovery = form.get("recovery") === "on";
  try {
    const credentials = await apiClient().verifyMfa(pending.challengeToken, code, recovery);
    await writeSession(userSession(credentials));
  } catch (error) {
    return { error: describe(error) };
  }
  store.delete(cookieName("pending", config.secureCookies));
  redirect("/");
}

export async function signOut(form: FormData): Promise<void> {
  const session = await currentSession();
  if (session !== undefined) {
    await assertFormRequest(session, form);
    if (session.kind === "user") {
      // The server revokes the session at once; a failure still signs out here.
      await apiClient(session).logout().catch(() => undefined);
    }
  }
  const config = webConfig();
  (await cookies()).delete(cookieName("session", config.secureCookies));
  redirect("/sign-in");
}

async function settle(transition: AuthTransition): Promise<SignInResult> {
  const config = webConfig();
  const store = await cookies();
  const pendingName = cookieName("pending", config.secureCookies);
  switch (transition.next) {
    case "AUTHENTICATED":
      if (transition.session === undefined) return { error: "The session was incomplete." };
      await writeSession(userSession(transition.session));
      store.delete(pendingName);
      return { next: "/" };
    case "MFA_REQUIRED":
      if (transition.challenge_token === undefined) return { error: "The MFA challenge was incomplete." };
      store.set(
        pendingName,
        sealPending(config.sessionKey, {
          step: "mfa",
          challengeToken: transition.challenge_token,
          expiresAt: Date.now() + PENDING_MAX_AGE_S * 1000,
        }),
        cookieOptions(config.secureCookies, PENDING_MAX_AGE_S),
      );
      return { next: "/mfa" };
    case "MFA_ENROLLMENT_REQUIRED":
      store.delete(pendingName);
      return {
        error:
          "This account must set up two-factor authentication first. Enroll in the Perpeto iOS app, then sign in here.",
      };
    case "PENDING_APPROVAL":
      store.delete(pendingName);
      return { next: "/pending" };
  }
}

async function writeSession(session: WebSession): Promise<void> {
  const config = webConfig();
  (await cookies()).set(
    cookieName("session", config.secureCookies),
    sealSession(config.sessionKey, session),
    cookieOptions(config.secureCookies, SESSION_MAX_AGE_S),
  );
}

/** A stable, random per-browser installation id, like the iOS app's. */
async function installationId(): Promise<string> {
  const config = webConfig();
  const store = await cookies();
  const name = cookieName("device", config.secureCookies);
  const existing = store.get(name)?.value;
  if (existing !== undefined && /^[0-9a-f]{64}$/u.test(existing)) return existing;
  const generated = randomBytes(32).toString("hex");
  store.set(name, generated, cookieOptions(config.secureCookies, DEVICE_MAX_AGE_S));
  return generated;
}

function browserName(userAgent: string | null): string {
  const agent = userAgent ?? "";
  const browser = /Edg\//u.test(agent)
    ? "Edge"
    : /Firefox\//u.test(agent)
      ? "Firefox"
      : /Chrome\//u.test(agent)
        ? "Chrome"
        : /Safari\//u.test(agent)
          ? "Safari"
          : "Browser";
  return `${browser} (web)`;
}

function describe(error: unknown): string {
  if (error instanceof PerpetoApiError) return error.message;
  return "Perpeto could not be reached. Try again shortly.";
}
