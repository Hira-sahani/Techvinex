import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
      signOut: mocks.signOut,
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: vi.fn(), message: vi.fn() },
}));

import { apiFetch } from "./apiClient";
import {
  createUnauthorizedCapture,
  type UnauthorizedCapture,
} from "./apiClient.testHelpers";

function makeResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  } as unknown as Response;
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string"
    ? input
    : (input as Request).url ?? String(input);
}

describe("apiClient — replay only happens on 401+retry, never on 500", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;
  let calls: Map<string, number>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: "fresh" }, user: null },
      error: null,
    });
    originalFetch = global.fetch;
    calls = new Map();
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    global.fetch = originalFetch;
  });

  it("counts fetch invocations: 1 for 500s, 1 for 401-no-retry, 2 for 401-retry", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      const n = (calls.get(url) ?? 0) + 1;
      calls.set(url, n);

      if (url.includes("/srv/")) return Promise.resolve(makeResponse(500));
      if (url.includes("/no/")) return Promise.resolve(makeResponse(401));
      // /retry/* — first attempt 401, replay returns 200.
      if (url.includes("/retry/"))
        return Promise.resolve(makeResponse(n === 1 ? 401 : 200));

      return Promise.resolve(makeResponse(200));
    }) as unknown as typeof fetch;

    await Promise.all([
      // 4x 500s with retry flag — replay must NOT happen.
      ...Array.from({ length: 4 }, (_, i) =>
        apiFetch(`/srv/${i}`, { retryOnUnauthorized: true }),
      ),
      // 3x 401s without retry — single fetch each, no replay.
      ...Array.from({ length: 3 }, (_, i) => apiFetch(`/no/${i}`)),
      // 5x 401s with retry — exactly one replay each (n=1 then n=2).
      ...Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/retry/${i}`, { retryOnUnauthorized: true }),
      ),
    ]);
    await capture.drain();

    // ---- Per-URL fetch counts ----
    for (let i = 0; i < 4; i++) {
      expect(calls.get(`/srv/${i}`), `500 endpoint /srv/${i} must NOT be replayed`).toBe(1);
    }
    for (let i = 0; i < 3; i++) {
      expect(calls.get(`/no/${i}`), `401 no-retry /no/${i} must NOT be replayed`).toBe(1);
    }
    for (let i = 0; i < 5; i++) {
      expect(
        calls.get(`/retry/${i}`),
        `401 retry /retry/${i} must be fetched exactly twice (initial + replay)`,
      ).toBe(2);
    }

    // ---- Aggregate fetch budget ----
    // 4*1 + 3*1 + 5*2 = 17
    const total = Array.from(calls.values()).reduce((a, b) => a + b, 0);
    expect(total).toBe(17);

    // ---- Refresh + telemetry sanity ----
    // Replays only happen when refresh succeeded — single deduped call.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // 500s never on bus, never in telemetry.
    capture.expectNoBusEmissionsFor("/srv/");
    expect(capture.telemetryFor("/srv/")).toHaveLength(0);

    // /retry/* replays succeeded — bus must NOT fire for them.
    capture.expectNoBusEmissionsFor("/retry/");
    expect(capture.countRetryAttempted(true, "/retry/")).toBe(5);

    // /no/* — initial_401, retryAttempted=false.
    expect(capture.telemetryFor("/no/")).toHaveLength(3);
    capture.expectRetryAttemptedFalseFor("/no/");
  });
});
