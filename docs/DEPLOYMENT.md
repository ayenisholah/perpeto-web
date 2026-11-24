# Web Deployment

## Image

`Dockerfile` builds the Next.js standalone server on `node:24-alpine` and runs it as the unprivileged `node` user, with a `/healthz` healthcheck. The build needs no deployment settings, and none are baked in.

## Staging

The staging host (`perpeto-backend`, DEC-0020 and DEC-0021) runs the image as its `web` compose service behind Caddy at `https://app.perpeto.xyz`. The service is read-only, with no capabilities and tmpfs for `/tmp` and the Next.js cache. The host renders `web.env` with only:

| Variable | Meaning |
|---|---|
| `PERPETO_API_URL` | `http://api:8080`, over the compose network |
| `PERPETO_WEB_ORIGIN` | `https://app.perpeto.xyz` |
| `PERPETO_WEB_SESSION_KEY` | 32-byte cookie key, generated once into `perpeto/staging/KEYS` |
| `PERPETO_GOOGLE_CLIENT_ID` | the Google web OAuth client ID (public) |
| `PERPETO_APPLE_SERVICES_ID` | the Apple Services ID (public); empty means Google only |

## Pipeline

`.github/workflows/DEPLOY_STAGING.yml` runs after Web CI succeeds on `main`:

1. Publishes `ghcr.io/ayenisholah/perpeto-web:sha-<commit>` and `:main`.
2. When `STAGING_ENABLED` is `true`, sends the backend's `Perpeto-UpdateWeb` SSM document to the staging host. That document accepts only a full-commit image of this repository and recreates the `web` container alone.
3. Checks `https://app.perpeto.xyz/sign-in` and `/healthz`.

## Operator setup

1. From `perpeto-backend`, after its web-hosting change is deployed: `scripts/aws/create-deploy-key.sh perpeto-web-deployer ayenisholah/perpeto-web staging`. This stores the deploy key and `AWS_REGION` in this repository's `staging` environment.
2. Set the repository variable `STAGING_ENABLED=true`.
3. **Google:** add `https://app.perpeto.xyz` as an authorized JavaScript origin on the web OAuth client.
4. **Apple** (optional): create a Services ID, verify `app.perpeto.xyz`, add it as a return URL, and set `PERPETO_APPLE_WEB_SERVICES_ID` in the backend's `deploy/ec2/staging.env`.
5. **DNS:** an A record `app.perpeto.xyz` → the staging Elastic IP. Until then the site answers at `https://app.<elastic-ip>.sslip.io`, where Google sign-in will not work because that origin is not registered.
