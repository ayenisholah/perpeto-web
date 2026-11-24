import { connection } from "next/server";

import { webConfig } from "@/lib/server/config";

import { SignInPanel } from "./SignInPanel";

export const metadata = { title: "Sign in · Perpeto" };

export default async function SignInPage() {
  // Read at request time so one image serves any deployment's client IDs.
  await connection();
  const config = webConfig();
  const googleClientId = process.env.PERPETO_GOOGLE_CLIENT_ID?.trim() || undefined;
  const appleServicesId = process.env.PERPETO_APPLE_SERVICES_ID?.trim() || undefined;
  return (
    <main className="auth">
      <div className="auth-card card">
        <div className="stack">
          <div className="brand">PERPETO</div>
          <h1>Your control plane</h1>
          <p className="subtitle">
            Sign in with Google or Apple. Perpeto never creates a password account, and LIVE trading stays locked.
          </p>
          <SignInPanel
            googleClientId={googleClientId}
            appleServicesId={appleServicesId}
            origin={config.origin}
            devSignInEnabled={config.devSignIn}
          />
        </div>
      </div>
    </main>
  );
}
