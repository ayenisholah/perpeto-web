"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PerpetoApiError, type PerpetoClient } from "@ayenisholah/perpeto-api-client";

import { apiClient, requireSession } from "@/lib/server/api";
import { assertFormRequest } from "@/lib/server/guard";

/**
 * Mutations. Each re-checks origin and CSRF, then calls the API as the
 * signed-in user; the API alone decides authorization (roles, the demo guard,
 * breakers, freshness). The outcome comes back as a notice on the page.
 */
async function run(
  form: FormData,
  path: string,
  success: string,
  call: (api: PerpetoClient) => Promise<unknown>,
): Promise<never> {
  const session = await requireSession();
  await assertFormRequest(session, form);
  let notice = `ok:${success}`;
  try {
    await call(apiClient(session));
  } catch (error) {
    notice =
      error instanceof PerpetoApiError
        ? `error:${error.message} (${error.code})`
        : "error:Perpeto could not be reached.";
  }
  revalidatePath(path);
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    throw new Error(`invalid ${name}`);
  }
  return value;
}

export async function openPosition(form: FormData): Promise<void> {
  const routeId = text(form, "route_id");
  await run(form, "/scanner", `Opened a paper position on ${routeId}.`, (api) =>
    api.createPosition({ route_id: routeId }),
  );
}

export async function closePosition(form: FormData): Promise<void> {
  const id = text(form, "id");
  await run(form, "/positions", "Close requested.", (api) => api.closePosition(id));
}

export async function setStrategyEnabled(form: FormData): Promise<void> {
  const id = text(form, "id");
  const enable = form.get("enable") === "true";
  await run(form, "/strategies", enable ? "Strategy enabled." : "Strategy disabled.", (api) =>
    enable ? api.enableStrategy(id) : api.disableStrategy(id),
  );
}

export async function acknowledgeAlert(form: FormData): Promise<void> {
  const id = text(form, "id");
  await run(form, "/alerts", "Alert acknowledged.", (api) => api.acknowledgeAlert(id));
}

export async function haltNewRisk(form: FormData): Promise<void> {
  await run(form, "/", "New risk halted.", (api) => api.halt("HALT_NEW_RISK", "Halted from the web console"));
}

export async function resumeControls(form: FormData): Promise<void> {
  await run(form, "/", "Controls resumed.", (api) => api.resumeControls());
}

export async function revokeSession(form: FormData): Promise<void> {
  const id = text(form, "id");
  await run(form, "/security", "Session revoked.", (api) => api.revokeSession(id));
}
