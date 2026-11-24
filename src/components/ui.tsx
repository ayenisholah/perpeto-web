import type { ReactNode } from "react";

import { formatPercent, formatUsd, isNegative } from "@/lib/format";

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle === undefined ? null : <p className="subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title === undefined ? null : <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value num">{value}</div>
      {detail === undefined ? null : <div className="tone-muted">{detail}</div>}
    </div>
  );
}

export type Tone = "accent" | "signal" | "positive" | "negative" | "warning" | "critical" | "info" | "muted";

export function Badge({ label, tone = "muted" }: { label: string; tone?: Tone }) {
  return <span className={`badge tone-${tone}`}>{label.replaceAll("_", " ")}</span>;
}

export function Usd({ value }: { value: string }) {
  return <span className={`num ${isNegative(value) ? "tone-negative" : ""}`}>{formatUsd(value)}</span>;
}

export function Pct({ value, places = 2 }: { value: string; places?: number }) {
  return <span className={`num ${isNegative(value) ? "tone-negative" : ""}`}>{formatPercent(value, places)}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Renders the `?notice=ok:…` / `?notice=error:…` outcome of a form action. */
export function Notice({ notice }: { notice?: string | string[] }) {
  if (typeof notice !== "string") return null;
  const [kind, ...rest] = notice.split(":");
  const message = rest.join(":");
  if ((kind !== "ok" && kind !== "error") || message.length === 0) return null;
  return (
    <p className={`notice ${kind}`} role={kind === "error" ? "alert" : "status"}>
      {message}
    </p>
  );
}

/** The per-session synchronizer token every mutating form posts (DEC-0021). */
export function Csrf({ token }: { token: string }) {
  return <input type="hidden" name="csrf" value={token} />;
}

export function LoadError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Perpeto could not be reached.";
  return <p className="notice error" role="alert">{message}</p>;
}
