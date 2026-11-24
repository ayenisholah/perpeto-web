import { closePosition } from "@/app/actions/operations";
import { Badge, Card, Csrf, Empty, LoadError, Notice, PageHead, Usd } from "@/components/ui";
import { formatTime } from "@/lib/format";
import { apiClient, currentViewer, requireSession } from "@/lib/server/api";
import { load, type SearchParams } from "@/lib/server/load";

export const metadata = { title: "Positions · Perpeto" };

const CLOSABLE = new Set(["OPEN", "RECOVERING"]);

export default async function PositionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice } = await searchParams;
  const viewer = await currentViewer();
  const list = await load(async () => apiClient(await requireSession()).listPositions());
  const positions = list.data?.positions ?? [];

  return (
    <>
      <PageHead title="Positions" subtitle="Hedged paper positions, newest first." />
      <Notice notice={notice} />
      {list.error === undefined ? null : <LoadError error={list.error} />}
      <Card>
        {positions.length === 0 && list.error === undefined ? (
          <Empty>No positions yet. Strategies open them automatically when a route qualifies.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>State</th>
                <th className="right">Notional</th>
                <th className="right">Funding</th>
                <th className="right">Realized PnL</th>
                <th>Opened</th>
                {viewer.canTrade ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id}>
                  <td>
                    <div className="mono">{position.route_id}</div>
                    {position.exit_reason === null ? null : <Badge label={position.exit_reason} tone="muted" />}
                  </td>
                  <td>
                    <Badge label={position.state} tone={position.state === "CLOSED" ? "muted" : "accent"} />
                  </td>
                  <td className="right">
                    <Usd value={position.target_notional} />
                  </td>
                  <td className="right">
                    <Usd value={position.funding_captured} />
                  </td>
                  <td className="right">
                    <Usd value={position.realized_pnl} />
                  </td>
                  <td className="num">{formatTime(position.opened_at)}</td>
                  {viewer.canTrade ? (
                    <td className="right">
                      {CLOSABLE.has(position.state) ? (
                        <form action={closePosition}>
                          <Csrf token={viewer.csrf} />
                          <input type="hidden" name="id" value={position.id} />
                          <button className="button danger" type="submit">
                            Close
                          </button>
                        </form>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
