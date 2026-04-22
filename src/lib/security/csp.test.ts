import { describe, expect, it } from "vitest";
import { buildAppCspHeader } from "./csp";

describe("buildAppCspHeader", () => {
  it("allows Clerk blob workers explicitly", () => {
    const csp = buildAppCspHeader();
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it("keeps the Clerk script allowlist in place", () => {
    const csp = buildAppCspHeader();
    expect(csp).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev",
    );
  });
});
