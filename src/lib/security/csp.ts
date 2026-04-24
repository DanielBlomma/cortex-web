const appCspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com https://clerk-telemetry.com",
  "frame-src https://*.clerk.accounts.dev",
];

export function buildAppCspHeader(): string {
  return appCspDirectives.join("; ");
}
