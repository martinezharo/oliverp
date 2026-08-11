import { describe, expect, it } from "vitest";
import { validateDevelopmentEnvironment } from "../../scripts/assert-development-deployment.mjs";

describe("development Convex environment guard", () => {
  it("accepts a matching personal dev deployment", () => {
    expect(
      validateDevelopmentEnvironment({
        CONVEX_DEPLOYMENT: "dev:calm-otter-123",
        NEXT_PUBLIC_CONVEX_URL: "https://calm-otter-123.convex.cloud",
      }),
    ).toEqual([]);
  });

  it("rejects a production deployment", () => {
    expect(
      validateDevelopmentEnvironment({
        CONVEX_DEPLOYMENT: "prod:reminiscent-cricket-450",
        NEXT_PUBLIC_CONVEX_URL: "https://reminiscent-cricket-450.convex.cloud",
      }),
    ).toContain("CONVEX_DEPLOYMENT points to production (prod:reminiscent-cricket-450).");
  });

  it("rejects a dev label paired with the production browser URL", () => {
    expect(
      validateDevelopmentEnvironment({
        CONVEX_DEPLOYMENT: "dev:calm-otter-123",
        NEXT_PUBLIC_CONVEX_URL: "https://reminiscent-cricket-450.convex.cloud",
      }),
    ).toContain(
      "Deployment mismatch: dev:calm-otter-123 cannot use https://reminiscent-cricket-450.convex.cloud. Expected https://calm-otter-123.convex.cloud.",
    );
  });
});
