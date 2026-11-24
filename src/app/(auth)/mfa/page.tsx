import { MfaForm } from "./MfaForm";

export const metadata = { title: "Two-factor · Perpeto" };

export default function MfaPage() {
  return (
    <main className="auth">
      <div className="auth-card card">
        <div className="stack">
          <h1>Two-factor check</h1>
          <p className="subtitle">Enter the six-digit code from your authenticator app, or a recovery code.</p>
          <MfaForm />
        </div>
      </div>
    </main>
  );
}
