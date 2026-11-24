import "server-only";

/**
 * Server-side configuration (DEC-0021). Nothing here is ever sent to the
 * browser: the API is reached over the compose network, and the session key
 * seals the cookies the browser holds.
 */
export interface WebConfig {
  /** The Perpeto API, e.g. `http://api:8080` on the staging host. */
  readonly apiUrl: string;
  /** The public origin, e.g. `https://app.perpeto.xyz`. */
  readonly origin: string;
  /** 32-byte AES-256-GCM key for every sealed cookie. */
  readonly sessionKey: Buffer;
  /** Secure, `__Host-` cookies; false only for plain-HTTP local development. */
  readonly secureCookies: boolean;
  /** Development sign-in against a PAPER backend started with `PERPETO_DEV_AUTH`. */
  readonly devSignIn: boolean;
}

let cached: WebConfig | undefined;

export function webConfig(): WebConfig {
  if (cached !== undefined) return cached;
  cached = parseWebConfig(process.env);
  return cached;
}

export function parseWebConfig(env: Record<string, string | undefined>): WebConfig {
  const apiUrl = required(env, "PERPETO_API_URL").replace(/\/+$/u, "");
  const origin = new URL(required(env, "PERPETO_WEB_ORIGIN")).origin;
  const sessionKey = Buffer.from(required(env, "PERPETO_WEB_SESSION_KEY"), "base64");
  if (sessionKey.length !== 32) {
    throw new Error("PERPETO_WEB_SESSION_KEY must be 32 bytes, base64-encoded");
  }
  const secureCookies = origin.startsWith("https://");
  const devSignIn = env.PERPETO_WEB_DEV_SIGN_IN?.trim().toLowerCase() === "true";
  if (devSignIn && secureCookies) {
    throw new Error("PERPETO_WEB_DEV_SIGN_IN is for plain-HTTP local development only");
  }
  return { apiUrl, origin, sessionKey, secureCookies, devSignIn };
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (value === undefined || value.length === 0) throw new Error(`${name} is required`);
  return value;
}
