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

describe("apiClient — mixed 500/401 burst via createUnauthorizedCapture", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "fail" },
    });
    originalFetch = global.fetch;
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    global.fetch = originalFetch;
  });

  it("attributes bus + retryAttempted correctly per endpoint family", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : (input as Request).url ?? String(input);
      // /srv/* -> 500, /auth/* -> 401
      return Promise.resolve(makeResponse(url.includes("/srv/") ? 500 : 401));
    }) as unknown as typeof fetch;

    // Concurrent burst:
    // - 5x 500s with retryOnUnauthorized=true (must NOT replay or emit bus)
    // - 4x 401s WITHOUT retryOnUnauthorized (initial_401, retryAttempted=false)
    // - 3x 401s WITH retryOnUnauthorized + failing refresh (refresh_failed, retryAttempted=true)
    await Promise.all([
      ...Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/srv/${i}`, { retryOnUnauthorized: true }),
      ),
      ...Array.from({ length: 4 }, (_, i) => apiFetch(`/auth/no/${i}`)),
      ...Array.from({ length: 3 }, (_, i) =>
        apiFetch(`/auth/yes/${i}`, { retryOnUnauthorized: true }),
      ),
    ]);
    await capture.drain();

    // 500 endpoints: zero bus, zero telemetry, zero replay/refresh.
    capture.expectNoBusEmissionsFor("/srv/");
    expect(capture.telemetryFor("/srv/")).toHaveLength(0);
    expect(capture.busFor("/srv/")).toHaveLength(0);
    expect(capture.countRetryAttempted(true, "/srv/")).toBe(0);
    expect(capture.countRetryAttempted(false, "/srv/")).toBe(0);

    // 401 no-retry endpoints: 4 telemetry events, all retryAttempted=false.
    expect(capture.telemetryFor("/auth/no/")).toHaveLength(4);
    capture.expectRetryAttemptedFalseFor("/auth/no/");
    expect(capture.countRetryAttempted(false, "/auth/no/")).toBe(4);
    expect(capture.countRetryAttempted(true, "/auth/no/")).toBe(0);
    for (const ev of capture.telemetryFor("/auth/no/")) {
      expect(ev.reason).toBe("initial_401");
    }

    // 401 with-retry endpoints: 3 telemetry events, all retryAttempted=true (refresh failed).
    expect(capture.telemetryFor("/auth/yes/")).toHaveLength(3);
    expect(capture.countRetryAttempted(true, "/auth/yes/")).toBe(3);
    expect(capture.countRetryAttempted(false, "/auth/yes/")).toBe(0);
    for (const ev of capture.telemetryFor("/auth/yes/")) {
      expect(ev.reason).toBe("refresh_failed");
    }

    // Aggregate buckets across the whole burst.
    const buckets = capture.telemetryCountsByRetryAttempted();
    expect(buckets.false).toBe(4);
    expect(buckets.true).toBe(3);
    expect(capture.totalTelemetry()).toBe(7);

    // Bus must only have 401 emissions; refresh deduped to 1 call.
    expect(capture.totalBus()).toBeGreaterThanOrEqual(1);
    for (const ev of capture.busEvents) {
      expect(ev.endpoint.startsWith("/auth/")).toBe(true);
    }
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });
});
