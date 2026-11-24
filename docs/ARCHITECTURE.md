# Web Architecture

DEC-0021 in `perpeto-backend/docs/DECISION.md` records the decision; this file describes the implementation.

## Request path

```text
browser ──HTTPS──▶ Caddy (app.perpeto.xyz) ──▶ web:3000 (Next.js) ──HTTP──▶ api:8080 (Perpeto API)
```

The browser never calls the API. The API stays bearer-only, with no production CORS.

## Sessions

- `src/lib/server/seal.ts` seals cookie values with AES-256-GCM under `PERPETO_WEB_SESSION_KEY`. The cookie name is bound as associated data, so a value sealed for one cookie cannot be replayed as another.
- `__Host-perpeto-session` (`src/lib/server/session.ts`) holds either:
  - a **user** session: access token, its expiry, refresh token, device ID and a CSRF secret; or
  - a **demo** session: access token, expiry and CSRF secret, with no refresh token (DEC-0017).
- `__Host-perpeto-pending` holds a sign-in in progress (the PKCE verifier and challenge, or the MFA challenge token) for ten minutes.
- `__Host-perpeto-device` is a random per-browser installation ID, so each browser is one device on the backend.
- Every cookie is `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/`. On plain-HTTP local development the `__Host-` prefix and `Secure` are dropped.
- **Renewal:** `src/proxy.ts` runs before every page. Within a minute of the access token's expiry it rotates the refresh token (user) or asks for a new demo session (demo), forwards the new cookie to the current render and returns it to the browser. If the API refuses, the session is dropped and the visitor goes to sign-in; a network failure keeps the cookie so the page can show the outage.
- **Revocation:** sign-out calls `POST /auth/logout`, and the backend refuses a revoked session's access token at once.

## Sign-in

1. The sign-in page asks the server for a challenge (`beginSignIn`). The server makes a PKCE pair, creates the backend challenge, keeps the verifier in the pending cookie and returns only the nonce.
2. Google Identity Services or Sign in with Apple JS runs in a popup with that nonce, and returns an ID token.
3. `completeSignIn` exchanges it with `platform: WEB`. The backend verifies the token, the PKCE verifier and, for a web exchange, the nonce for either provider.
4. The result is a session, an MFA step (`/mfa`), a pending-approval page, or a request to enroll MFA in the iOS app first.

Client IDs are read at request time (`PERPETO_GOOGLE_CLIENT_ID`, `PERPETO_APPLE_SERVICES_ID`), never inlined at build time, so one image serves any deployment.

## Mutations

Mutations are Server Actions in `src/app/actions/`. Each one:

1. re-reads the session;
2. requires the exact configured `Origin` and, when the browser sends it, `Sec-Fetch-Site: same-origin`;
3. requires the per-session CSRF token from the form (`src/lib/server/csrf.ts`);
4. calls the API as the user. The API alone authorizes: roles, the demo guard, breakers and freshness.

Next.js also refuses a Server Action whose `Origin` differs from `Host`. The interface hides controls the viewer cannot use (`viewerFrom` in `src/lib/server/api.ts`), but that is presentation only.

## Headers

`next.config.ts` sets a Content Security Policy that allows only Google's and Apple's sign-in origins as third parties, `frame-ancestors 'none'`, `same-origin-allow-popups` for the sign-in popups, and a restrictive Permissions-Policy. Caddy adds HSTS, `nosniff`, the referrer policy and `X-Frame-Options`.
