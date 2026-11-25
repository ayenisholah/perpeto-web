# Perpeto Web

The web platform for [Perpeto](https://github.com/ayenisholah/perpeto-backend), a public, self-hostable reference implementation of a funding-rate arbitrage system. It is a Next.js server that serves:

- **the read-only live demo** (DEC-0017): a seeded PAPER account trading live public market data, no account needed;
- **the operator console**: Google and Apple sign-in, scanner, positions, strategies, portfolio, alerts, health, sessions and emergency controls.

It runs at **[app.perpeto.xyz](https://app.perpeto.xyz)** (DEC-0021). The live demo is the M3 public surface. Google and Apple sign-in are implemented but stay off until their provider origins are configured: without `PERPETO_GOOGLE_CLIENT_ID` and `PERPETO_APPLE_SERVICES_ID` the sign-in page offers only the demo. The iOS client lives in [`perpeto-mobile`](https://github.com/ayenisholah/perpeto-mobile); every trading decision, credential and order stays in the backend. LIVE trading is permanently locked.

## How it is built

- **Backend-for-frontend.** The browser holds one encrypted, `httpOnly`, `Secure`, `SameSite=Strict` cookie. The Next.js server keeps the access and refresh tokens inside it and calls the API over the private network; page JavaScript never sees an API token. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- **Mutations** are Server Actions. Each checks the exact `Origin`, Fetch Metadata and a per-session CSRF token, and the API still decides authorization.
- **Money stays exact.** Decimals arrive as strings and are formatted without floating point (`src/lib/format.ts`).

## Local development

Needs Node 24 and a local PAPER backend started with `PERPETO_DEMO_ENABLED=true` and `PERPETO_DEV_AUTH=true` (see `perpeto-backend/docs/DEPLOYMENT.md`).

```bash
npm ci
export PERPETO_API_URL=http://127.0.0.1:8080
export PERPETO_WEB_ORIGIN=http://127.0.0.1:3000
export PERPETO_WEB_SESSION_KEY="$(openssl rand -base64 32)"
export PERPETO_WEB_DEV_SIGN_IN=true   # plain-HTTP local development only
npm run dev
```

Optional: `PERPETO_GOOGLE_CLIENT_ID` (the Google web OAuth client) and `PERPETO_APPLE_SERVICES_ID` enable the provider buttons.

## Checks

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
bash scripts/check-docs.sh
```

## Documents

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): sessions, sign-in and request security.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): the image and the staging deploy.
- [`docs/TESTING.md`](docs/TESTING.md): what is tested and how.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
- Product, decisions and milestones live in `perpeto-backend/docs` (`PRODUCT_SPEC`, `DECISION`, `MILESTONE`).
