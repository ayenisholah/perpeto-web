export const metadata = { title: "Awaiting approval · Perpeto" };

export default function PendingPage() {
  return (
    <main className="auth">
      <div className="auth-card card">
        <div className="stack">
          <h1>Awaiting approval</h1>
          <p className="subtitle">
            Your account exists but an Owner has not approved it yet. You will have access once they do.
          </p>
          <a className="button secondary" href="/sign-in" style={{ textAlign: "center", textDecoration: "none" }}>
            Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
