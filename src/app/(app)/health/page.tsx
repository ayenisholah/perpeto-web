import { Badge, Card, Empty, LoadError, PageHead } from "@/components/ui";
import { formatTime } from "@/lib/format";
import { apiClient, requireSession } from "@/lib/server/api";
import { load } from "@/lib/server/load";

export const metadata = { title: "Health · Perpeto" };

export default async function HealthPage() {
  const health = await load(async () => apiClient(await requireSession()).getSystemHealth());
  const data = health.data;

  return (
    <>
      <PageHead
        title="Health"
        subtitle={data === undefined ? "Venue feeds and services." : `Venue feeds and services · as of ${formatTime(data.as_of)}`}
      />
      {health.error === undefined ? null : <LoadError error={health.error} />}
      <Card title="Venues">
        {data === undefined || data.venues.length === 0 ? (
          <Empty>No venue reports yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Venue</th>
                <th>Feed</th>
                <th className="right">Data age (s)</th>
                <th className="right">Clock drift (ms)</th>
                <th>Last observed</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.venues.map((venue) => (
                <tr key={venue.venue}>
                  <td className="mono">{venue.venue}</td>
                  <td>
                    <Badge
                      label={venue.feed_status}
                      tone={venue.feed_status === "HEALTHY" ? "positive" : venue.feed_status === "DEGRADED" ? "warning" : "critical"}
                    />
                  </td>
                  <td className="right num">{venue.market_data_age_seconds}</td>
                  <td className="right num">{venue.clock_drift_ms}</td>
                  <td className="num">{formatTime(venue.last_observed_at)}</td>
                  <td className="mono tone-muted">{venue.feed_error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Services">
        {data === undefined || data.services.length === 0 ? (
          <Empty>No service heartbeats reported.</Empty>
        ) : (
          <table>
            <tbody>
              {data.services.map((service) => (
                <tr key={service.service}>
                  <td className="mono">{service.service}</td>
                  <td>
                    <Badge label={service.status} tone={service.status === "HEALTHY" || service.status === "OK" ? "positive" : "warning"} />
                  </td>
                  <td className="num">{formatTime(service.observed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
