"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { beginSignIn, completeSignIn, devSignIn, startDemo, type SignInResult } from "@/app/actions/session";

interface GoogleId {
  initialize(options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
    ux_mode?: "popup";
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

interface AppleIdAuth {
  init(options: { clientId: string; scope: string; redirectURI: string; usePopup: boolean; nonce: string }): void;
  signIn(): Promise<{
    authorization: { id_token: string };
    user?: { name?: { firstName?: string; lastName?: string } };
  }>;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
    AppleID?: { auth: AppleIdAuth };
  }
}

export function SignInPanel({
  googleClientId,
  appleServicesId,
  origin,
  devSignInEnabled,
}: {
  googleClientId?: string;
  appleServicesId?: string;
  origin: string;
  devSignInEnabled: boolean;
}) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const [googleReady, setGoogleReady] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);

  const settle = useCallback((result: SignInResult) => {
    if ("error" in result) setError(result.error);
    // A full navigation, so the proxy sees the new session cookie.
    else window.location.assign(result.next);
  }, []);

  // Google Identity Services must know the challenge nonce before it renders
  // its button, so a fresh challenge is started as soon as the script loads.
  useEffect(() => {
    if (!googleReady || googleClientId === undefined || googleButton.current === null) return;
    const google = window.google;
    if (google === undefined) return;
    let cancelled = false;
    void beginSignIn("GOOGLE")
      .then(({ nonce }) => {
        if (cancelled || googleButton.current === null) return;
        google.accounts.id.initialize({
          client_id: googleClientId,
          nonce,
          ux_mode: "popup",
          callback: ({ credential }) => {
            startTransition(async () => settle(await completeSignIn("GOOGLE", credential)));
          },
        });
        google.accounts.id.renderButton(googleButton.current, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          width: 320,
        });
      })
      .catch(() => setError("Perpeto could not start Google sign-in."));
    return () => {
      cancelled = true;
    };
  }, [googleReady, googleClientId, settle]);

  const signInWithApple = () => {
    const apple = window.AppleID;
    if (apple === undefined || appleServicesId === undefined) return;
    setError(undefined);
    startTransition(async () => {
      try {
        const { nonce } = await beginSignIn("APPLE");
        apple.auth.init({ clientId: appleServicesId, scope: "name email", redirectURI: origin, usePopup: true, nonce });
        const response = await apple.auth.signIn();
        const name = [response.user?.name?.firstName, response.user?.name?.lastName].filter(Boolean).join(" ");
        settle(await completeSignIn("APPLE", response.authorization.id_token, name || undefined));
      } catch {
        setError("Apple sign-in was cancelled or failed.");
      }
    });
  };

  return (
    <div className="stack">
      {googleClientId === undefined ? null : (
        <>
          <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setGoogleReady(true)} />
          <div ref={googleButton} aria-label="Sign in with Google" />
        </>
      )}
      {appleServicesId === undefined ? null : (
        <>
          <Script
            src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
            strategy="afterInteractive"
          />
          <button className="button secondary" type="button" onClick={signInWithApple} disabled={pending}>
            Continue with Apple
          </button>
        </>
      )}
      {devSignInEnabled ? (
        <button
          className="button secondary"
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => settle(await devSignIn()))}
        >
          Development sign-in (local PAPER only)
        </button>
      ) : null}
      {error === undefined ? null : (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <hr style={{ borderColor: "var(--border)", width: "100%" }} />
      <form action={startDemo}>
        <button className="button" type="submit" style={{ width: "100%" }}>
          Open the live demo
        </button>
      </form>
      <p className="tone-muted" style={{ margin: 0, fontSize: 13 }}>
        The demo is a seeded PAPER account trading live public market data. No account is needed, and nothing can be
        changed.
      </p>
    </div>
  );
}
