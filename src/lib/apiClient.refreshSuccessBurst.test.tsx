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

describe("apiClient — mixed burst with successful refresh", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-old" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    // Successful refresh — single shared call due to dedupedRefreshSession.
    mocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: "tok-new" }, user: null },
      error: null,
    });
    originalFetch = global.fetch;
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    global.fetch = originalFetch;
  });

  it("records retryAttempted=true on /retry/* with reason=initial_401, replay succeeds, refresh deduped to 1", async () => {
    // Per-URL call counter: first hit -> 401, replay -> 200.
    const calls = new Map<string, number>();

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url ?? String(input);
      const n = (calls.get(url) ?? 0) + 1;
      calls.set(url, n);

      // /srv/* is a 500 forever — must never replay or refresh.
      if (url.includes("/srv/")) return Promise.resolve(makeResponse(500));

      // /no-retry/* always 401 — caller doesn't ask for retry.
      if (url.includes("/no-retry/")) return Promise.resolve(makeResponse(401));

      // /retry/* — first attempt 401, replay succeeds with 200.
      if (url.includes("/retry/")) {
        return Promise.resolve(makeResponse(n === 1 ? 401 : 200));
      }

      return Promise.resolve(makeResponse(200));
    }) as unknown as typeof fetch;

    await Promise.all([
      // 4x 500 with retry flag — must not refresh or emit telemetry.
      ...Array.from({ length: 4 }, (_, i) =>
        apiFetch(`/srv/${i}`, { retryOnUnauthorized: true }),
      ),
      // 3x 401 no-retry — initial_401 / retryAttempted=false.
      ...Array.from({ length: 3 }, (_, i) => apiFetch(`/no-retry/${i}`)),
      // 5x 401 with retry — refresh succeeds (deduped), replay returns 200.
      ...Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/retry/${i}`, { retryOnUnauthorized: true }),
      ),
    ]);
    await capture.drain();

    // Refresh must dedupe to a single attempt across the 5 concurrent retriers.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // signOut deduped to 1 — fired only by the /no-retry/* handler burst,
    // never by /retry/* (those replays succeeded).
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    // 500 endpoints: never on bus, never in telemetry.
    capture.expectNoBusEmissionsFor("/srv/");
    expect(capture.telemetryFor("/srv/")).toHaveLength(0);

    // /no-retry/*: 3 events, initial_401, retryAttempted=false.
    expect(capture.telemetryFor("/no-retry/")).toHaveLength(3);
    capture.expectRetryAttemptedFalseFor("/no-retry/");
    for (const ev of capture.telemetryFor("/no-retry/")) {
      expect(ev.reason).toBe("initial_401");
    }

    // /retry/*: 5 events, all retryAttempted=true with reason=initial_401
    // (recorded BEFORE the successful replay).
    const retryEvents = capture.telemetryFor("/retry/");
    expect(retryEvents).toHaveLength(5);
    expect(capture.countRetryAttempted(true, "/retry/")).toBe(5);
    expect(capture.countRetryAttempted(false, "/retry/")).toBe(0);
    for (const ev of retryEvents) {
      expect(ev.retryAttempted).toBe(true);
      expect(ev.reason).toBe("initial_401");
    }

    // Successful replay means the unauthorized BUS must not fire for /retry/*.
    capture.expectNoBusEmissionsFor("/retry/");

    // Aggregate buckets.
    const buckets = capture.telemetryCountsByRetryAttempted();
    expect(buckets.true).toBe(5);
    expect(buckets.false).toBe(3);
    expect(capture.totalTelemetry()).toBe(8);

    // Bus events only originate from /no-retry/*.
    for (const ev of capture.busEvents) {
      expect(ev.endpoint.startsWith("/no-retry/")).toBe(true);
    }
  });
});
