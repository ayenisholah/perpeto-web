import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The request-bound helpers: the origin/CSRF guard, the session reader and
 * the data-access client. `next/headers` is replaced with per-test values.
 */
const requestHeaders = new Map<string, string>();
const requestCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => requestHeaders.get(name) ?? null }),
  cookies: async () => ({ get: (name: string) => (requestCookies.has(name) ? { value: requestCookies.get(name) } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));

const key = randomBytes(32);
process.env.PERPETO_API_URL = "http://api.test";
process.env.PERPETO_WEB_ORIGIN = "https://app.perpeto.xyz";
process.env.PERPETO_WEB_SESSION_KEY = key.toString("base64");

const { assertFormRequest, assertSameOrigin, ForbiddenRequest } = await import("./guard");
const { apiClient, currentSession, requireSession } = await import("./api");
const { load } = await import("./load");
const { sealSession } = await import("./session");

const session = { kind: "demo" as const, accessToken: "a", accessExpiresAt: Date.now() + 600_000, csrf: "token" };

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

beforeEach(() => {
  requestHeaders.clear();
  requestCookies.clear();
});

describe("guard", () => {
  it("accepts a same-origin form with the session's token", async () => {
    requestHeaders.set("origin", "https://app.perpeto.xyz");
    requestHeaders.set("sec-fetch-site", "same-origin");
    await expect(assertFormRequest(session, form({ csrf: "token" }))).resolves.toBeUndefined();
  });

  it("refuses a cross-origin request and a missing or wrong token", async () => {
    requestHeaders.set("origin", "https://evil.example");
    await expect(assertSameOrigin()).rejects.toBeInstanceOf(ForbiddenRequest);
    requestHeaders.set("origin", "https://app.perpeto.xyz");
    await expect(assertFormRequest(session, form({}))).rejects.toThrow("CSRF");
    await expect(assertFormRequest(session, form({ csrf: "other" }))).rejects.toThrow("CSRF");
  });
});

describe("session reader", () => {
  it("reads the sealed __Host- cookie", async () => {
    requestCookies.set("__Host-perpeto-session", sealSession(key, session));
    await expect(currentSession()).resolves.toEqual(session);
    await expect(requireSession()).resolves.toEqual(session);
  });

  it("sends a visitor without a valid session to sign in", async () => {
    requestCookies.set("__Host-perpeto-session", "forged");
    await expect(currentSession()).resolves.toBeUndefined();
    await expect(requireSession()).rejects.toThrow("redirect:/sign-in");
  });
});

describe("data access", () => {
  it("sends the session's access token, and none without a session", async () => {
    const calls: Array<string | null> = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(new Headers(init?.headers).get("authorization"));
      return Response.json({ status: "OK", mode: "PAPER", stage: "M3_CONNECTORS" });
    }) as typeof fetch;
    try {
      await apiClient(session).listAlerts();
      await apiClient().createDemoSession();
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toEqual(["Bearer a", null]);
  });

  it("turns a failed read into a value", async () => {
    await expect(load(async () => 1)).resolves.toEqual({ data: 1 });
    const failure = new Error("down");
    await expect(load(async () => { throw failure; })).resolves.toEqual({ error: failure });
  });
});
