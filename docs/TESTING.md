# Web Testing

## Unit tests (Vitest, `npm run test:coverage`)

The coverage floor covers `src/lib` (lines 80%, functions 80%). The tests cover:

- **Cookie sealing:** round trip; rejection of another key, another purpose, tampering and garbage; no plaintext leak.
- **Sessions:** construction, CSRF secret kept across refresh, kind validation, renewal timing, pending sign-in expiry, `__Host-` cookie attributes.
- **CSRF:** exact-origin matching (including look-alike hosts), Fetch Metadata, constant-time token comparison.
- **The request guard and session reader:** under mocked `next/headers`.
- **PKCE S256 and configuration validation:** development sign-in is refused on an HTTPS origin.
- **Role derivation:** the demo is read-only whatever its roles.
- **Lossless decimal formatting:** rounding, grouping, percentages, signs.

## End-to-end

Run against a local PAPER backend (`PERPETO_DEMO_ENABLED=true`, `PERPETO_DEV_AUTH=true`) with the production image run `--read-only --cap-drop ALL`. Drive headless Chrome through:

1. **Demo:** open the live demo, read the overview and scanner, see no mutation controls, leave the demo.
2. **Owner:** development sign-in through the nonce-bound `WEB` exchange; halt and resume new risk; the Security page lists the browser session; sign out, then `/` redirects to sign-in.

Real Google and Apple sign-in need the deployed origin and are checked on staging.
