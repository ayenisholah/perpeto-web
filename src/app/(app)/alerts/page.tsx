import { acknowledgeAlert } from "@/app/actions/operations";
import { Badge, Card, Csrf, Empty, LoadError, Notice, PageHead, type Tone } from "@/components/ui";
import { formatTime } from "@/lib/format";
import { apiClient, currentViewer, requireSession } from "@/lib/server/api";
import { load, type SearchParams } from "@/lib/server/load";

export const metadata = { title: "Alerts · Perpeto" };

const SEVERITY: Record<string, Tone> = { CRITICAL: "critical", WARNING: "warning", INFORMATIONAL: "info" };

export default async function AlertsPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice } = await searchParams;
  const viewer = await currentViewer();
  const list = await load(async () => apiClient(await requireSession()).listAlerts());
  const alerts = list.data ?? [];

  return (
    <>
      <PageHead
        title="Alerts"
        subtitle="Deduplicated risk and strategy events. Acknowledging records that you saw it; it does not resolve the incident."
      />
      <Notice notice={notice} />
      {list.error === undefined ? null : <LoadError error={list.error} />}
      {alerts.length === 0 && list.error === undefined ? (
        <Card>
          <Empty>Nothing needs your attention.</Empty>
        </Card>
      ) : null}
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <div className="page-head" style={{ marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>{alert.title}</h2>
            <Badge label={alert.severity} tone={SEVERITY[alert.severity] ?? "muted"} />
          </div>
          <p className="tone-muted" style={{ marginTop: 0 }}>
            {alert.message}
          </p>
          <div className="row">
            <span className="num tone-muted">{formatTime(alert.created_at)}</span>
            {alert.acknowledged_at !== null ? (
              <span className="tone-muted">Acknowledged {formatTime(alert.acknowledged_at)}</span>
            ) : viewer.readOnly ? (
              <Badge label="unacknowledged" tone="warning" />
            ) : (
              <form action={acknowledgeAlert}>
                <Csrf token={viewer.csrf} />
                <input type="hidden" name="id" value={alert.id} />
                <button className="button secondary" type="submit">
                  Acknowledge
                </button>
              </form>
            )}
          </div>
        </Card>
      ))}
    </>
  );
}
