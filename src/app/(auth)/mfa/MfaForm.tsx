"use client";

import { useActionState } from "react";

import { verifyMfa } from "@/app/actions/session";

export function MfaForm() {
  const [state, action, pending] = useActionState(verifyMfa, null);
  return (
    <form action={action} className="stack">
      <label className="stack" style={{ gap: 6 }}>
        <span className="stat-label">Code</span>
        <input type="text" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={64} />
      </label>
      <label className="row">
        <input type="checkbox" name="recovery" /> This is a recovery code
      </label>
      <button className="button" type="submit" disabled={pending}>
        Verify
      </button>
      {state !== null && "error" in state ? (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      ) : null}
      <a href="/sign-in" className="tone-muted">
        Start again
      </a>
    </form>
  );
}
