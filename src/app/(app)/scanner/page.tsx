import { openPosition } from "@/app/actions/operations";
import { Badge, Card, Csrf, Empty, LoadError, Notice, PageHead, Pct, Usd } from "@/components/ui";
import { formatDecimal, formatTime } from "@/lib/format";
import { apiClient, currentViewer, requireSession } from "@/lib/server/api";
import { load, type SearchParams } from "@/lib/server/load";

export const metadata = { title: "Scanner · Perpeto" };

export default async function ScannerPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice } = await searchParams;
  const viewer = await currentViewer();
  const scan = await load(async () => apiClient(await requireSession()).listOpportunities());

  return (
    <>
      <PageHead
        title="Scanner"
        subtitle={
          scan.data === undefined
            ? "Ranked funding routes from live public data."
            : `Ranked funding routes from live public data · scanned ${formatTime(scan.data.scanned_at)} · ${scan.data.model_version}`
        }
      />
      <Notice notice={notice} />
      {scan.error === undefined ? null : <LoadError error={scan.error} />}
      <Card>
        {scan.data === undefined || scan.data.opportunities.length === 0 ? (
          <Empty>No routes ranked in the latest scan.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Long / short</th>
                <th className="right">Gross APR</th>
                <th className="right">Net APR</th>
                <th className="right">Profitability</th>
                <th className="right">Basis (bps)</th>
                <th className="right">Capital</th>
                <th>Next funding</th>
                {viewer.canTrade ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {scan.data.opportunities.map((opportunity) => (
                <tr key={opportunity.route_id}>
                  <td>
                    <div className="mono">{opportunity.underlying}</div>
                    <Badge label={opportunity.route_type} tone="info" />
                  </td>
                  <td className="mono">
                    <span className="tone-info">{opportunity.long_venue}</span> /{" "}
                    <span className="tone-warning">{opportunity.short_venue}</span>
                  </td>
                  <td className="right">
                    <Pct value={opportunity.gross_funding_apr} />
                  </td>
                  <td className="right">
                    <Pct value={opportunity.net_apr} />
                  </td>
                  <td className="right">
                    <Pct value={opportunity.profitability_probability} places={0} />
                  </td>
                  <td className="right num">{formatDecimal(opportunity.entry_basis_bps, 1)}</td>
                  <td className="right">
                    <Usd value={opportunity.required_capital} />
                  </td>
                  <td className="num">{formatTime(opportunity.next_funding_at)}</td>
                  {viewer.canTrade ? (
                    <td className="right">
                      <form action={openPosition}>
                        <Csrf token={viewer.csrf} />
                        <input type="hidden" name="route_id" value={opportunity.route_id} />
                        <button className="button secondary" type="submit" disabled={!opportunity.within_limits}>
                          Open
                        </button>
                      </form>
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
