import type { NextConfig } from "next";

/**
 * Sign-in loads Google Identity Services and Sign in with Apple JS, so their
 * script, frame and connect origins are the only third parties allowed. Next
 * inlines bootstrap scripts, hence 'unsafe-inline' for scripts and styles.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client https://appleid.cdn-apple.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "frame-src https://accounts.google.com/gsi/ https://appleid.apple.com",
  "connect-src 'self' https://accounts.google.com/gsi/",
  "img-src 'self' data: https://*.googleusercontent.com",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Every page renders live, per-session data, so nothing is prerendered.
  cacheComponents: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          // Google's popup sign-in needs to talk back to this window.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
