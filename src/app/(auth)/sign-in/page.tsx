import { connection } from "next/server";

import { webConfig } from "@/lib/server/config";

import { SignInPanel } from "./SignInPanel";

export const metadata = { title: "Sign in · Perpeto" };

/** Says only what this deployment actually offers. */
function subtitle(google: boolean, apple: boolean, dev: boolean): string {
  const providers = [google ? "Google" : undefined, apple ? "Apple" : undefined].filter(Boolean);
  if (providers.length > 0) {
    return `Sign in with ${providers.join(" or ")}. Perpeto never creates a password account, and LIVE trading stays locked.`;
  }
  if (dev) return "Local development: use the development sign-in or open the demo. LIVE trading stays locked.";
  return "Explore the live demo: a read-only PAPER account trading live public market data. Operator sign-in is not enabled on this deployment.";
}

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
          <p className="subtitle">{subtitle(googleClientId !== undefined, appleServicesId !== undefined, config.devSignIn)}</p>
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
