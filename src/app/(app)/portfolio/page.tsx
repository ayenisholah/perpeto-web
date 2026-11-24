import { Card, Empty, LoadError, PageHead, Pct, Stat, Usd } from "@/components/ui";
import { formatTime } from "@/lib/format";
import { apiClient, requireSession } from "@/lib/server/api";
import { load } from "@/lib/server/load";

export const metadata = { title: "Portfolio · Perpeto" };

export default async function PortfolioPage() {
  const portfolio = await load(async () => apiClient(await requireSession()).getPortfolio());
  const data = portfolio.data;

  return (
    <>
      <PageHead
        title="Portfolio"
        subtitle={data === undefined ? "Paper equity and PnL." : `Paper equity and PnL · as of ${formatTime(data.as_of)}`}
      />
      {portfolio.error === undefined ? null : <LoadError error={portfolio.error} />}
      {data === undefined ? null : (
        <>
          <div className="grid">
            <Stat label="Equity" value={<Usd value={data.equity} />} />
            <Stat label="Deployed" value={<Usd value={data.deployed_capital} />} />
            <Stat label="Net PnL" value={<Usd value={data.pnl.net} />} />
            <Stat label="Return on deployed" value={<Pct value={data.pnl.return_on_deployed_capital} />} />
          </div>
          <Card title="PnL breakdown">
            <table>
              <tbody>
                {(
                  [
                    ["Realized funding", data.pnl.realized_funding],
                    ["Realized trading", data.pnl.realized_trading],
                    ["Unrealized legs", data.pnl.unrealized_leg],
                    ["Fees", data.pnl.fees],
                    ["Net", data.pnl.net],
                  ] as const
                ).map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    <td className="right">
                      <Usd value={value} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="grid">
            {(
              [
                ["By venue", data.by_venue],
                ["By underlying", data.by_underlying],
              ] as const
            ).map(([title, allocations]) => (
              <Card key={title} title={title}>
                {allocations.length === 0 ? (
                  <Empty>Nothing deployed.</Empty>
                ) : (
                  <table>
                    <tbody>
                      {allocations.map((allocation) => (
                        <tr key={allocation.key}>
                          <td className="mono">{allocation.key}</td>
                          <td className="right">
                            <Usd value={allocation.deployed_capital} />
                          </td>
                          <td className="right">
                            <Pct value={allocation.fraction} places={1} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
