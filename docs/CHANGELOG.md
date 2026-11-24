# Changelog

All notable repository changes are recorded here using Keep a Changelog categories.

## [Unreleased]

### Added

- The Perpeto web platform (DEC-0021): a Next.js 16 server consuming `@ayenisholah/perpeto-api-client` 0.25.0.
  - **Backend-for-frontend:**
    - AES-256-GCM-sealed `__Host-` cookies hold the session, the pending sign-in and a per-browser device ID. The browser never sees an API token.
    - `src/proxy.ts` renews the access token before it lapses: it rotates the refresh token for a user and asks for a new demo session for the demo.
  - **Sign-in:**
    - Google Identity Services and Sign in with Apple JS run with a server-held PKCE verifier and the challenge nonce, exchanged as a `WEB` device.
    - TOTP MFA follows, plus pending-approval and enroll-on-iOS outcomes.
    - Development sign-in is available only on plain-HTTP local origins.
  - **The read-only live demo** (DEC-0017), one click from the sign-in page.
  - **Pages:** overview, scanner, positions, strategies, portfolio, alerts, health and security.
  - **Actions:** open and close positions, enable and disable strategies, acknowledge alerts, halt and resume new risk, and revoke sessions. Each passes exact-origin, Fetch Metadata and per-session CSRF checks; read-only viewers see no controls.
  - **Security headers:** a Content Security Policy limited to Google's and Apple's sign-in origins, no framing, and a restrictive Permissions-Policy.
  - **Image:** a non-root standalone image with a healthcheck.
  - **Workflows:** Web CI (docs, lint, typecheck, coverage floor, audit, build, image) and Deploy Staging (GHCR, then `Perpeto-UpdateWeb` over SSM).
