import { signOut } from "@/app/actions/session";
import { Badge, Csrf } from "@/components/ui";
import { currentViewer } from "@/lib/server/api";

import { Nav } from "./Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await currentViewer();
  const name = viewer.demo ? "Demo viewer" : (viewer.user.display_name ?? viewer.user.email ?? "Signed in");
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="stack" style={{ gap: 8 }}>
          <div className="brand">PERPETO</div>
          <div className="row" style={{ gap: 6 }}>
            <Badge label="Paper" tone="signal" />
            {viewer.demo ? <Badge label="Read-only demo" tone="muted" /> : null}
            {!viewer.demo && viewer.readOnly ? <Badge label="Viewer" tone="muted" /> : null}
          </div>
        </div>
        <Nav />
        <div className="stack" style={{ marginTop: "auto", gap: 8 }}>
          <span className="tone-muted" style={{ fontSize: 13 }}>
            {name}
          </span>
          <form action={signOut}>
            <Csrf token={viewer.csrf} />
            <button className="button secondary" type="submit" style={{ width: "100%" }}>
              {viewer.demo ? "Leave the demo" : "Sign out"}
            </button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
