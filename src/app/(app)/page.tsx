import Link from "next/link";

import { haltNewRisk, resumeControls } from "@/app/actions/operations";
import { Badge, Card, Csrf, Empty, LoadError, Notice, PageHead, Pct, Stat, Usd } from "@/components/ui";
import { formatTime } from "@/lib/format";
import { apiClient, currentViewer, requireSession } from "@/lib/server/api";
import { load, type SearchParams } from "@/lib/server/load";

export const metadata = { title: "Overview · Perpeto" };

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice } = await searchParams;
  const viewer = await currentViewer();
  const api = apiClient(await requireSession());
  const [portfolio, positions, scan, controls, health] = await Promise.all([
    load(() => api.getPortfolio()),
    load(() => api.listPositions()),
    load(() => api.listOpportunities()),
    load(() => api.getControls()),
    load(() => api.getSystemHealth()),
  ]);
  const open = positions.data?.positions.filter((position) => position.state !== "CLOSED") ?? [];
  const breakers = controls.data?.breakers.filter((breaker) => breaker.active) ?? [];

  return (
    <>
      <PageHead
        title={viewer.demo ? "Live demo" : "Overview"}
        subtitle="Paper equity, what is deployed, and what needs attention. All figures in USD."
      />
      <Notice notice={notice} />
      {portfolio.error === undefined ? null : <LoadError error={portfolio.error} />}
      {portfolio.data === undefined ? null : (
        <div className="grid">
          <Stat label="Equity" value={<Usd value={portfolio.data.equity} />} />
          <Stat
            label="Available"
            value={<Usd value={portfolio.data.deployable_equity} />}
            detail={
              <>
                <Usd value={portfolio.data.deployed_capital} /> deployed
              </>
            }
          />
          <Stat label="Net PnL" value={<Usd value={portfolio.data.pnl.net} />} />
          <Stat label="Funding income" value={<Usd value={portfolio.data.pnl.realized_funding} />} />
        </div>
      )}

      <Card title="Market feeds">
        {health.error === undefined ? null : <LoadError error={health.error} />}
        <div className="row">
          {health.data?.venues.map((venue) => (
            <span key={venue.venue} className="row" style={{ gap: 6 }}>
              <strong>{venue.venue}</strong>
              <Badge
                label={venue.feed_status}
                tone={venue.feed_status === "HEALTHY" ? "positive" : venue.feed_status === "DEGRADED" ? "warning" : "critical"}
              />
            </span>
          ))}
        </div>
        {health.data === undefined ? null : <p className="tone-muted">As of {formatTime(health.data.as_of)}</p>}
      </Card>

      <Card title="Emergency controls">
        {breakers.length === 0 ? (
          <p className="tone-positive">No active breakers. New paper risk is allowed.</p>
        ) : (
          <ul>
            {breakers.map((breaker) => (
              <li key={breaker.id}>
                <Badge label={breaker.action} tone="critical" /> {breaker.reason} · {formatTime(breaker.created_at)}
              </li>
            ))}
          </ul>
        )}
        {viewer.canTrade ? (
          <div className="row">
            <form action={haltNewRisk}>
              <Csrf token={viewer.csrf} />
              <button className="button danger" type="submit">
                Halt new risk
              </button>
            </form>
            {breakers.length === 0 ? null : (
              <form action={resumeControls}>
                <Csrf token={viewer.csrf} />
                <button className="button secondary" type="submit">
                  Resume
                </button>
              </form>
            )}
          </div>
        ) : null}
      </Card>

      <Card title={`Open positions (${open.length})`}>
        {open.length === 0 ? (
          <Empty>
            Nothing is deployed right now. <Link href="/scanner">Open the scanner</Link>.
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>State</th>
                <th className="right">Notional</th>
                <th className="right">Funding</th>
              </tr>
            </thead>
            <tbody>
              {open.slice(0, 5).map((position) => (
                <tr key={position.id}>
                  <td className="mono">{position.route_id}</td>
                  <td>
                    <Badge label={position.state} tone="accent" />
                  </td>
                  <td className="right">
                    <Usd value={position.target_notional} />
                  </td>
                  <td className="right">
                    <Usd value={position.funding_captured} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Best routes now">
        {scan.error === undefined ? null : <LoadError error={scan.error} />}
        {scan.data === undefined || scan.data.opportunities.length === 0 ? (
          <Empty>No routes ranked in the latest scan.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th className="right">Net APR</th>
                <th className="right">Profitability</th>
                <th>Limits</th>
              </tr>
            </thead>
            <tbody>
              {scan.data.opportunities.slice(0, 5).map((opportunity) => (
                <tr key={opportunity.route_id}>
                  <td className="mono">{opportunity.route_id}</td>
                  <td className="right">
                    <Pct value={opportunity.net_apr} />
                  </td>
                  <td className="right">
                    <Pct value={opportunity.profitability_probability} places={0} />
                  </td>
                  <td>
                    <Badge label={opportunity.within_limits ? "within" : "outside"} tone={opportunity.within_limits ? "positive" : "warning"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
