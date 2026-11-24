import { NextResponse, type NextRequest } from "next/server";
import { PerpetoApiError, PerpetoClient } from "@ayenisholah/perpeto-api-client";

import { webConfig } from "@/lib/server/config";
import {
  cookieName,
  cookieOptions,
  needsRenewal,
  sealSession,
  SESSION_MAX_AGE_S,
  unsealSession,
  userSession,
  type WebSession,
} from "@/lib/server/session";

/** Pages a signed-out visitor may open. */
const PUBLIC_PATHS = new Set(["/sign-in", "/mfa", "/pending"]);

/**
 * Session renewal (DEC-0021). Server Components cannot set cookies, so the
 * access token is renewed here, before rendering, whenever it is about to
 * lapse: a user session rotates its refresh token, and the read-only demo asks
 * for a new demo session. The renewed cookie is forwarded to this request and
 * returned to the browser. A session the API refuses is dropped.
 */
export async function proxy(request: NextRequest) {
  const config = webConfig();
  const name = cookieName("session", config.secureCookies);
  const session = unsealSession(config.sessionKey, request.cookies.get(name)?.value);
  const path = request.nextUrl.pathname;

  if (session === undefined) {
    if (PUBLIC_PATHS.has(path)) return NextResponse.next();
    return redirectTo(request, "/sign-in", name);
  }
  if (path === "/sign-in") return NextResponse.redirect(new URL("/", request.url));
  if (!needsRenewal(session, Date.now())) return NextResponse.next();

  let renewed: WebSession;
  try {
    renewed = await renew(config.apiUrl, session);
  } catch (error) {
    // The API refused the session: sign out. A network failure keeps the old
    // cookie so the page can show the outage instead of a sign-in loop.
    if (error instanceof PerpetoApiError) return redirectTo(request, "/sign-in", name);
    return NextResponse.next();
  }
  const sealed = sealSession(config.sessionKey, renewed);
  request.cookies.set(name, sealed);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(name, sealed, cookieOptions(config.secureCookies, SESSION_MAX_AGE_S));
  return response;
}

async function renew(apiUrl: string, session: WebSession): Promise<WebSession> {
  const client = new PerpetoClient({ baseUrl: apiUrl });
  if (session.kind === "demo") {
    const demo = await client.createDemoSession();
    return {
      kind: "demo",
      accessToken: demo.access_token,
      accessExpiresAt: Date.parse(demo.access_token_expires_at),
      csrf: session.csrf,
    };
  }
  return userSession(await client.refresh(session.refreshToken, session.deviceId), session.csrf);
}

function redirectTo(request: NextRequest, path: string, cookie: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete(cookie);
  return response;
}

export const config = {
  // Everything except static assets and the health probe.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|healthz).*)"],
};
