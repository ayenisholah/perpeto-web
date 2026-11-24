import { setStrategyEnabled } from "@/app/actions/operations";
import { Badge, Card, Csrf, Empty, LoadError, Notice, PageHead, Pct, Usd } from "@/components/ui";
import { apiClient, currentViewer, requireSession } from "@/lib/server/api";
import { load, type SearchParams } from "@/lib/server/load";

export const metadata = { title: "Strategies · Perpeto" };

export default async function StrategiesPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice } = await searchParams;
  const viewer = await currentViewer();
  const list = await load(async () => apiClient(await requireSession()).listStrategies());
  const strategies = list.data ?? [];

  return (
    <>
      <PageHead title="Strategies" subtitle="Versioned PAPER strategies the engine runs every scan." />
      <Notice notice={notice} />
      {list.error === undefined ? null : <LoadError error={list.error} />}
      {strategies.length === 0 && list.error === undefined ? (
        <Card>
          <Empty>No strategies yet. Create one in the Perpeto app.</Empty>
        </Card>
      ) : null}
      {strategies.map((strategy) => {
        const version = strategy.current;
        return (
          <Card key={strategy.id}>
            <div className="page-head" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>{strategy.name}</h2>
                <div className="row" style={{ gap: 6 }}>
                  <Badge label={strategy.enabled ? "enabled" : "disabled"} tone={strategy.enabled ? "positive" : "muted"} />
                  <Badge label={`v${version.version}`} tone="muted" />
                  {version.route_types.map((type) => (
                    <Badge key={type} label={type} tone="info" />
                  ))}
                </div>
              </div>
              {viewer.canTrade ? (
                <form action={setStrategyEnabled}>
                  <Csrf token={viewer.csrf} />
                  <input type="hidden" name="id" value={strategy.id} />
                  <input type="hidden" name="enable" value={strategy.enabled ? "false" : "true"} />
                  <button className={`button ${strategy.enabled ? "danger" : "secondary"}`} type="submit">
                    {strategy.enabled ? "Disable" : "Enable"}
                  </button>
                </form>
              ) : null}
            </div>
            <table>
              <tbody>
                <tr>
                  <th>Venues</th>
                  <td className="mono">{version.allowed_venues.join(", ") || "Any"}</td>
                  <th>Assets</th>
                  <td className="mono">{version.allowed_assets.join(", ") || "Any"}</td>
                </tr>
                <tr>
                  <th>Minimum net APR</th>
                  <td>
                    <Pct value={version.min_net_apr} />
                  </td>
                  <th>Exit below</th>
                  <td>
                    <Pct value={version.exit_net_apr} />
                  </td>
                </tr>
                <tr>
                  <th>Allocation</th>
                  <td>
                    {version.allocation.method === "FIXED" && version.allocation.value !== undefined ? (
                      <Usd value={version.allocation.value} />
                    ) : (
                      <span className="mono">{version.allocation.method}</span>
                    )}
                  </td>
                  <th>Max concurrent</th>
                  <td className="num">{version.max_concurrent}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        );
      })}
    </>
  );
}
