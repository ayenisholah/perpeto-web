import { revokeSession } from "@/app/actions/operations";
import { Badge, Card, Csrf, Empty, LoadError, Notice, PageHead } from "@/components/ui";
import { formatTime } from "@/lib/format";
import { apiClient, currentViewer, requireSession } from "@/lib/server/api";
import { load, type SearchParams } from "@/lib/server/load";

export const metadata = { title: "Security · Perpeto" };

export default async function SecurityPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice } = await searchParams;
  const viewer = await currentViewer();
  const user = viewer.user;

  if (viewer.demo) {
    return (
      <>
        <PageHead title="Security" subtitle="This is the read-only public demo of a PAPER deployment." />
        <Card title={user.tenant.display_name}>
          <p className="tone-muted">
            You are viewing a seeded demo tenant without an account. Everything here is read-only: the server refuses
            every change, and no exchange credential exists on this deployment.
          </p>
        </Card>
      </>
    );
  }

  const sessions = await load(async () => apiClient(await requireSession()).listSessions());

  return (
    <>
      <PageHead
        title="Security"
        subtitle="Your session lives in an encrypted, httpOnly cookie; this browser never sees an API token."
      />
      <Notice notice={notice} />
      <Card title={user.tenant.display_name}>
        <div className="row" style={{ gap: 6 }}>
          {user.roles.map((role) => (
            <Badge key={role} label={role} tone="accent" />
          ))}
          <Badge label={user.tenant.state} tone="muted" />
          <Badge label={user.mfa_enrolled ? "two-factor on" : "two-factor off"} tone={user.mfa_enrolled ? "positive" : "warning"} />
        </div>
        <p className="tone-muted">
          Signed in as {user.email ?? user.display_name ?? user.id} with {user.linked_providers.join(" and ") || "no provider"}.
          Passkeys, exchange credentials and account deletion are managed in the Perpeto iOS app.
        </p>
      </Card>
      <Card title="Sessions">
        {sessions.error === undefined ? null : <LoadError error={sessions.error} />}
        {sessions.data === undefined || sessions.data.length === 0 ? (
          <Empty>No sessions.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Started</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.data.map((session) => (
                <tr key={session.id}>
                  <td>
                    {session.device_name} {session.current ? <Badge label="this browser" tone="positive" /> : null}
                  </td>
                  <td className="num">{formatTime(session.created_at)}</td>
                  <td className="num">{formatTime(session.last_seen_at)}</td>
                  <td className="right">
                    {session.current ? null : (
                      <form action={revokeSession}>
                        <Csrf token={viewer.csrf} />
                        <input type="hidden" name="id" value={session.id} />
                        <button className="button danger" type="submit">
                          Revoke
                        </button>
                      </form>
                    )}
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
