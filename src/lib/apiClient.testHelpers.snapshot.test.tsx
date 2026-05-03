import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));

import { createUnauthorizedCapture } from "./apiClient.testHelpers";

describe("createUnauthorizedCapture — shape & messages", () => {
  const capture = createUnauthorizedCapture();
  afterEach(() => capture.dispose());

  it("exposes the expected helper surface", () => {
    const methodNames = [
      "newTelemetryEvents",
      "telemetryFor",
      "busFor",
      "drain",
      "expectNoBusEmissions",
      "expectNoBusEmissionsFor",
      "expectAllRetryAttemptedFalse",
      "expectRetryAttemptedFalseFor",
      "expectRetryAttemptedCounterZero",
      "dispose",
    ] as const;

    for (const name of methodNames) {
      expect(typeof (capture as unknown as Record<string, unknown>)[name]).toBe(
        "function",
      );
    }
    expect(Array.isArray(capture.busEvents)).toBe(true);
    expect(capture.busEvents).toHaveLength(0);
  });

  it("produces stable assertion failure messages (snapshot)", () => {
    const fakeBus = { endpoint: "/leak/x", reason: "initial_401" } as never;
    (capture.busEvents as Array<typeof fakeBus>).push(fakeBus);

    const messages: Record<string, string> = {};
    const collect = (key: string, fn: () => void) => {
      try {
        fn();
        messages[key] = "<no error>";
      } catch (e) {
        messages[key] = (e as Error).message
          .split("\n")[0]
          .replace(/\s+\d+\s*$/, "")
          .trim();
      }
    };

    collect("expectNoBusEmissions", () => capture.expectNoBusEmissions());
    collect("expectNoBusEmissionsFor", () =>
      capture.expectNoBusEmissionsFor("/leak/"),
    );

    expect(messages).toMatchInlineSnapshot(`
      {
        "expectNoBusEmissions": "expected no session-expired bus emissions",
        "expectNoBusEmissionsFor": "expected no bus emissions for endpoint containing "/leak/"",
      }
    `);
  });
});
