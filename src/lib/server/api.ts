import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PerpetoClient, type CurrentUser } from "@ayenisholah/perpeto-api-client";

import { webConfig } from "./config";
import { cookieName, unsealSession, type WebSession } from "./session";

/**
 * The data access layer. Every API call goes through a client built for one
 * request from the sealed session cookie; nothing is shared across users.
 */
export function apiClient(session?: WebSession): PerpetoClient {
  const accessToken = session?.accessToken;
  return new PerpetoClient({ baseUrl: webConfig().apiUrl, getAccessToken: () => accessToken });
}

export const currentSession = cache(async (): Promise<WebSession | undefined> => {
  // Cookies first: that marks the page dynamic before any runtime-only
  // configuration is read, so builds need no deployment settings.
  const store = await cookies();
  const config = webConfig();
  return unsealSession(config.sessionKey, store.get(cookieName("session", config.secureCookies))?.value);
});

export async function requireSession(): Promise<WebSession> {
  const session = await currentSession();
  if (session === undefined) redirect("/sign-in");
  return session;
}

export interface Viewer {
  readonly user: CurrentUser;
  readonly demo: boolean;
  /** Owner or Trader: may open, close and configure. */
  readonly canTrade: boolean;
  readonly isOwner: boolean;
  /** No mutation at all: the demo, or no role beyond Viewer. */
  readonly readOnly: boolean;
  /** The per-session CSRF token every form posts back. */
  readonly csrf: string;
}

export const currentViewer = cache(async (): Promise<Viewer> => {
  const session = await requireSession();
  const user = await apiClient(session).me();
  return viewerFrom(user, session.kind === "demo", session.csrf);
});

export function viewerFrom(user: CurrentUser, demoSession: boolean, csrf: string): Viewer {
  const demo = demoSession || user.demo === true;
  const roles = new Set<string>(user.roles);
  const canTrade = !demo && (roles.has("OWNER") || roles.has("TRADER"));
  const privileged = canTrade || roles.has("APPROVER");
  return {
    user,
    demo,
    canTrade,
    isOwner: !demo && roles.has("OWNER"),
    readOnly: demo || !privileged,
    csrf,
  };
}
