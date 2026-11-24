import "server-only";

import { headers } from "next/headers";

import { webConfig } from "./config";
import { csrfTokenMatches, isSameOriginRequest } from "./csrf";
import type { WebSession } from "./session";

export class ForbiddenRequest extends Error {}

/** Every state-changing request must come from our own origin (DEC-0021). */
export async function assertSameOrigin(): Promise<void> {
  if (!isSameOriginRequest(await headers(), webConfig().origin)) {
    throw new ForbiddenRequest("cross-origin request refused");
  }
}

/** Origin check plus the per-session synchronizer token posted by the form. */
export async function assertFormRequest(session: WebSession, form: FormData): Promise<void> {
  await assertSameOrigin();
  if (!csrfTokenMatches(session.csrf, form.get("csrf"))) {
    throw new ForbiddenRequest("missing or invalid CSRF token");
  }
}
